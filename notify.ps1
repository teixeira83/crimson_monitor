param(
    [string]$Title,
    [string]$Message
)

Add-Type -AssemblyName System.Windows.Forms

$balloon = New-Object System.Windows.Forms.NotifyIcon
$balloon.Icon = [System.Drawing.SystemIcons]::Information
$balloon.BalloonTipIcon = 'Warning'
$balloon.BalloonTipTitle = $Title
$balloon.BalloonTipText = $Message
$balloon.Visible = $true
$balloon.ShowBalloonTip(10000)

Start-Sleep -Seconds 6
$balloon.Dispose()
