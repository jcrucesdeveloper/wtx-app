package com.wtxworkout.wear

import android.os.SystemClock
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.CompactButton
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.delay

/** Amber for "not confirmed": the same family as WTX's warm-up set colour on the phone. */
internal val WtxWarning = Color(0xFFE9A13B)

/**
 * The screen the watch shows: reads the runtime's model and a clock that only ticks while the
 * screen is visible. The countdown is redrawn locally from a monotonic deadline; no message
 * arrives per second.
 */
@Composable
fun WatchRoot(runtime: WatchRuntime) {
    val model by runtime.model.collectAsState()
    var now by remember { mutableLongStateOf(SystemClock.elapsedRealtime()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                now = SystemClock.elapsedRealtime()
                delay(TICK_MS)
            }
        }
    }
    WatchScreen(state = WatchScreens.from(model, now), onAdjust = runtime::adjust)
}

private const val TICK_MS = 250L

/** Pure drawing of a [WatchScreenState]. Previews and the app both use it; only the app has a runtime. */
@Composable
fun WatchScreen(state: WatchScreenState, onAdjust: (direction: Int) -> Unit = {}) {
    val compact = LocalConfiguration.current.screenHeightDp <= COMPACT_HEIGHT_DP
    when (state) {
        WatchScreenState.Searching -> MessageScreen(stringResource(R.string.searching_message))
        WatchScreenState.NoHost -> MessageScreen(
            message = stringResource(R.string.no_host_message),
            title = stringResource(R.string.no_host_title),
        )
        WatchScreenState.NotReady -> MessageScreen(stringResource(R.string.not_ready_message))
        WatchScreenState.Idle -> MessageScreen(stringResource(R.string.waiting_message))
        is WatchScreenState.Active -> ActiveScreen(state, compact)
        is WatchScreenState.Resting -> RestingScreen(state, compact, onAdjust)
        is WatchScreenState.Ended -> MessageScreen(
            message = stringResource(
                when (state.reason) {
                    "finished" -> R.string.ended_finished
                    "discarded" -> R.string.ended_discarded
                    else -> R.string.ended_default
                },
            ),
            showName = false,
        )
    }
}

private const val COMPACT_HEIGHT_DP = 200

@Composable
private fun ScreenColumn(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            // Extra side padding keeps the text inside the circle's chord.
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) { content() }
}

/** WTX's identity and one sentence: used for every state with nothing to count down. */
@Composable
private fun MessageScreen(message: String, title: String? = null, showName: Boolean = true) {
    ScreenColumn {
        Icon(
            painter = painterResource(R.drawable.ic_dumbbell),
            contentDescription = null,
            tint = Color.Unspecified,
            modifier = Modifier.size(36.dp),
        )
        if (showName) {
            Spacer(Modifier.height(2.dp))
            Text(
                text = stringResource(R.string.app_name),
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
        }
        Spacer(Modifier.height(6.dp))
        if (title != null) {
            Text(
                text = title,
                color = MaterialTheme.colorScheme.onBackground,
                style = MaterialTheme.typography.titleSmall,
                textAlign = TextAlign.Center,
            )
        }
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ActiveScreen(state: WatchScreenState.Active, compact: Boolean) {
    ScreenColumn {
        if (state.unsynced) {
            StatusLine(stringResource(R.string.unsynced), WtxWarning)
        } else {
            StatusLine(stringResource(R.string.active_title), MaterialTheme.colorScheme.primary)
        }
        Text(
            text = stringResource(R.string.active_no_rest),
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = if (compact) 28.sp else 32.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(8.dp))
        NextBlock(state.next, compact)
    }
}

@Composable
private fun RestingScreen(state: WatchScreenState.Resting, compact: Boolean, onAdjust: (Int) -> Unit) {
    ScreenColumn {
        val notice = state.notice
        when {
            notice != null -> StatusLine(noticeText(notice), MaterialTheme.colorScheme.primary)
            state.unsynced -> StatusLine(stringResource(R.string.unsynced), WtxWarning)
            state.pending -> StatusLine(stringResource(R.string.rest_pending), MaterialTheme.colorScheme.onSurfaceVariant)
            else -> StatusLine(stringResource(R.string.rest_title), MaterialTheme.colorScheme.primary)
        }
        Text(
            text = formatClock(state.remainingSeconds),
            color = if (state.unsynced) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onBackground,
            fontSize = if (compact) 38.sp else 46.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AdjustButton(
                label = stringResource(R.string.rest_minus, state.stepSeconds),
                description = stringResource(R.string.rest_minus_description, state.stepSeconds),
                enabled = state.canAdjust,
            ) { onAdjust(-1) }
            AdjustButton(
                label = stringResource(R.string.rest_plus, state.stepSeconds),
                description = stringResource(R.string.rest_plus_description, state.stepSeconds),
                enabled = state.canAdjust,
            ) { onAdjust(1) }
        }
        Spacer(Modifier.height(if (compact) 4.dp else 8.dp))
        NextBlock(state.next, compact)
    }
}

/** The next set or exercise: name on top, "Set 2 of 3 · 60 kg × 8" below. Long text ellipsizes. */
@Composable
private fun NextBlock(next: NextAction?, compact: Boolean) {
    if (next == null) return
    if (next.isDone) {
        Text(
            text = stringResource(R.string.next_all_done),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        return
    }
    Text(
        text = next.exercise,
        color = MaterialTheme.colorScheme.onBackground,
        style = MaterialTheme.typography.titleSmall,
        textAlign = TextAlign.Center,
        maxLines = if (compact) 1 else 2,
        overflow = TextOverflow.Ellipsis,
    )
    val detail = listOf(next.position, next.load).filter { it.isNotBlank() }.joinToString(" · ")
    if (detail.isNotEmpty()) {
        Text(
            text = detail,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center,
            maxLines = if (compact) 1 else 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun StatusLine(text: String, color: Color) {
    Text(
        text = text,
        color = color,
        style = MaterialTheme.typography.labelMedium,
        textAlign = TextAlign.Center,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

@Composable
private fun AdjustButton(label: String, description: String, enabled: Boolean, onClick: () -> Unit) {
    CompactButton(
        onClick = onClick,
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
            contentColor = MaterialTheme.colorScheme.onSurface,
            disabledContainerColor = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.5f),
            disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
        ),
        modifier = Modifier.semantics { contentDescription = description },
    ) {
        Text(text = label, style = MaterialTheme.typography.labelMedium, maxLines = 1)
    }
}

@Composable
private fun noticeText(notice: Notice): String = when (notice) {
    is Notice.Rejected -> stringResource(
        when (notice.reason) {
            WearProtocol.REASON_REST_ENDED -> R.string.notice_rest_ended
            WearProtocol.REASON_REST_MISMATCH -> R.string.notice_rest_mismatch
            WearProtocol.REASON_SESSION_MISMATCH, WearProtocol.REASON_NO_SESSION -> R.string.notice_session_changed
            WearProtocol.REASON_NOT_READY -> R.string.notice_not_ready
            else -> R.string.notice_rejected
        },
    )
    Notice.NoAnswer -> stringResource(R.string.notice_no_answer)
    Notice.NotSent -> stringResource(R.string.notice_not_sent)
}

/** "01:30". Whole seconds, minutes uncapped ("100:00" is fine for a very long rest). */
internal fun formatClock(totalSeconds: Int): String {
    val s = totalSeconds.coerceAtLeast(0)
    return "%02d:%02d".format(s / 60, s % 60)
}
