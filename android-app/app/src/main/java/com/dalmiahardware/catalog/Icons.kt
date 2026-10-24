package com.dalmiahardware.catalog

import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.size

// 24×24 line icons as SVG path data.
private val iconPaths = mapOf(
    "heart" to "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    "search" to "M3.5 10.5a7 7 0 1 0 14 0a7 7 0 1 0-14 0M16 16L21 21",
    "close" to "M6 6L18 18M6 18L18 6",
    "next" to "M4 12H20M13 5l7 7-7 7",
    "back" to "M20 12H4M11 5l-7 7 7 7",
    "grid" to "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    "filter" to "M4 6H20M7 12H17M10 18H14",
    "info" to "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11V17M12 7h0.01",
    "check" to "M4 12l5 5L20 6",
    "external" to "M14 3h7v7M10 14L21 3M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
    "image" to "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM6.5 8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M3 17l6-6 5 5 3-3 4 4",
)

@Composable
fun Icon(name: String, size: Int = 24, color: Color = Color.White, filled: Boolean = false, modifier: Modifier = Modifier) {
    val vector = remember(name, color, filled) {
        ImageVector.Builder(defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 24f, viewportHeight = 24f).addPath(
            pathData = PathParser().parsePathString(iconPaths.getValue(name)).toNodes(),
            fill = if (filled) SolidColor(color) else null,
            stroke = SolidColor(color),
            strokeLineWidth = 1.7f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ).build()
    }
    Image(rememberVectorPainter(vector), contentDescription = null, modifier = modifier.size(size.dp))
}
