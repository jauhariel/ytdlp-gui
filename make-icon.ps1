# Generate app.ico (256x256 PNG-in-ICO) — gradient rounded square + panah download
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'

# rounded rect path
$rect = New-Object System.Drawing.Rectangle 8, 8, 240, 240
$r = 56
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = $r * 2
$path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
$path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
$path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
$path.CloseFigure()

# gradient fill (indigo -> violet)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect,
  ([System.Drawing.Color]::FromArgb(99, 102, 241)),
  ([System.Drawing.Color]::FromArgb(168, 85, 247)), 45
$g.FillPath($brush, $path)

# panah download putih
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 24
$pen.StartCap = 'Round'; $pen.EndCap = 'Round'
$pen.LineJoin = 'Round'
$g.DrawLine($pen, 128, 58, 128, 150)          # batang
$g.DrawLine($pen, 86, 114, 128, 150)          # kepala kiri
$g.DrawLine($pen, 170, 114, 128, 150)         # kepala kanan
$g.DrawLine($pen, 74, 196, 182, 196)          # alas

$pngPath = "$PSScriptRoot\app-icon-tmp.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# bungkus PNG jadi .ico
$png = [System.IO.File]::ReadAllBytes($pngPath)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0)          # reserved
$bw.Write([uint16]1)          # type = icon
$bw.Write([uint16]1)          # count
$bw.Write([byte]0)            # width  (0 = 256)
$bw.Write([byte]0)            # height (0 = 256)
$bw.Write([byte]0)            # colors
$bw.Write([byte]0)            # reserved
$bw.Write([uint16]1)          # planes
$bw.Write([uint16]32)         # bitcount
$bw.Write([uint32]$png.Length)
$bw.Write([uint32]22)         # offset data
$bw.Write($png)
[System.IO.File]::WriteAllBytes("$PSScriptRoot\app.ico", $ms.ToArray())
$bw.Close()
Remove-Item $pngPath
Write-Output "app.ico dibuat ($($png.Length) bytes PNG di dalam ICO)"
