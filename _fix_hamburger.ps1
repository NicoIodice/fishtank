$f = 'c:\GIT\_Personal\fishtank\_bmad-output\planning-artifacts\ux-designs\ux-Fishtank-2026-06-04\EXPERIENCE.md'
$txt = [IO.File]::ReadAllText($f)
$apos = [char]8217
$nl = [char]13 + [char]10
$old = '; `aria-expanded` mirrors the sidebar' + $apos + 's current open state' + $nl + '- **Mobile sidebar overlay:**'
$new = '; `aria-expanded` mirrors the sidebar' + $apos + 's current open state. The main sidebar <nav> element carries id="main-sidebar" so the `aria-controls` association resolves correctly.' + $nl + '- **Mobile sidebar overlay:**'
$idx = $txt.IndexOf($old)
if ($idx -ge 0) {
    $out = $txt.Replace($old, $new)
    [IO.File]::WriteAllText($f, $out, [Text.Encoding]::UTF8)
    Write-Output "Applied at $idx"
} else {
    Write-Output "NOT FOUND (idx=$idx)"
}
