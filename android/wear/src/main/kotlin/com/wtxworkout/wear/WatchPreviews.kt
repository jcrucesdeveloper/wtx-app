package com.wtxworkout.wear

import androidx.compose.runtime.Composable
import androidx.wear.compose.ui.tooling.preview.WearPreviewLargeRound
import androidx.wear.compose.ui.tooling.preview.WearPreviewSmallRound

/**
 * Compose previews of every state. They draw [WatchScreen] from hand-made states and never
 * touch the runtime, the Data Layer, the alarm or the notification: they cannot send or
 * receive anything, and nothing here is reachable from the app.
 */
private val SampleNext = NextAction(
    kind = "set",
    exercise = "Bench Press",
    position = "Serie 2 de 3",
    load = "60 kg × 8",
)

private val LongNext = NextAction(
    kind = "exercise",
    exercise = "Press de banca inclinado con mancuernas agarre neutro",
    position = "Serie 1 de 4",
    load = "22,5 kg × 10 con pausa de dos segundos abajo",
)

private fun resting(
    next: NextAction? = SampleNext,
    unsynced: Boolean = false,
    canAdjust: Boolean = true,
    pending: Boolean = false,
    notice: Notice? = null,
) = WatchScreenState.Resting(
    remainingSeconds = 90,
    stepSeconds = 15,
    next = next,
    unsynced = unsynced,
    canAdjust = canAdjust,
    pending = pending,
    notice = notice,
)

@Composable
private fun Preview(state: WatchScreenState) {
    WtxTheme { WatchScreen(state) }
}

@WearPreviewLargeRound @Composable private fun RestingLarge() = Preview(resting())
@WearPreviewSmallRound @Composable private fun RestingSmall() = Preview(resting())
@WearPreviewLargeRound @Composable private fun RestingLongNamesLarge() = Preview(resting(LongNext))
@WearPreviewSmallRound @Composable private fun RestingLongNamesSmall() = Preview(resting(LongNext))
@WearPreviewLargeRound @Composable private fun RestingUnsynced() = Preview(resting(unsynced = true, canAdjust = false))
@WearPreviewLargeRound @Composable private fun RestingPending() = Preview(resting(pending = true))
@WearPreviewLargeRound @Composable private fun RestingRejected() =
    Preview(resting(notice = Notice.Rejected(WearProtocol.REASON_REST_ENDED)))
@WearPreviewLargeRound @Composable private fun RestingLastSet() = Preview(resting(NextAction("done", "", "", "")))
@WearPreviewLargeRound @Composable private fun ActiveNoRest() =
    Preview(WatchScreenState.Active("Push day", SampleNext, unsynced = false))
@WearPreviewLargeRound @Composable private fun ActiveUnsynced() =
    Preview(WatchScreenState.Active("Push day", SampleNext, unsynced = true))
@WearPreviewLargeRound @Composable private fun Searching() = Preview(WatchScreenState.Searching)
@WearPreviewLargeRound @Composable private fun NoHost() = Preview(WatchScreenState.NoHost)
@WearPreviewLargeRound @Composable private fun HostIdle() = Preview(WatchScreenState.Idle)
@WearPreviewSmallRound @Composable private fun HostIdleSmall() = Preview(WatchScreenState.Idle)
@WearPreviewLargeRound @Composable private fun Ended() = Preview(WatchScreenState.Ended("finished"))
