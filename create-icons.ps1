$iconsDir = Join-Path $PSScriptRoot "icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
Add-Type -AssemblyName System.Drawing

foreach ($size in @(16, 48, 128)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::Transparent)

  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
  $margin = [Math]::Max(1, [int]($size / 8))
  $g.FillRectangle($brush, $margin, $margin, $size - 2 * $margin, $size - 2 * $margin)

  $penWidth = [Math]::Max(1, [int]($size / 16))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, $penWidth)
  $mid = [int]($size / 2)
  $g.DrawLine($pen, $margin * 2, $mid, $size - $margin * 2, $mid)
  $g.DrawLine($pen, $mid, $margin * 2, $mid, $size - $margin * 2)

  $path = Join-Path $iconsDir ("icon" + $size + ".png")
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

Write-Output "icons created"
