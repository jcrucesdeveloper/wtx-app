package com.wtxworkout.wear

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme

// WTX's dark palette and default accent, from src/assets/base.css.
internal val WtxBackground = Color(0xFF0F1012)
internal val WtxSurface = Color(0xFF222428)
internal val WtxHeading = Color(0xFFF4F4F5)
internal val WtxText = Color(0xFFF4F4F5).copy(alpha = 0.62f)
internal val WtxAccent = Color(0xFFE0263A)
internal val WtxOnAccent = Color(0xFFFFFFFF)

private val WtxColorScheme = ColorScheme(
    background = WtxBackground,
    onBackground = WtxHeading,
    primary = WtxAccent,
    onPrimary = WtxOnAccent,
    surfaceContainer = WtxSurface,
    onSurface = WtxHeading,
    onSurfaceVariant = WtxText,
)

@Composable
fun WtxTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = WtxColorScheme, content = content)
}
