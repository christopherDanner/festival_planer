# NOTES — Lernpräferenzen & Arbeitsweise

## Präferenzen (User)
- **Hands-on.** Echte Befehle, selbst tippen, am echten Hetzner-Server. Wenig
  Theorie-Vorlauf, schnell ins Tun.
- **Sprache:** Deutsch. Knapp halten (vgl. CLAUDE.md: extrem konzis).
- Arbeitet lokal auf **Windows** → "Lektion öffnen"-Befehle Windows-tauglich
  geben (`start ...`). Server selbst ist Ubuntu.
- Vorkenntnis: SSH-Login, navigieren, Pakete installieren. Server-Themen
  (systemd, Firewall, Nginx, Hardening) noch unklar.

## Didaktik-Entscheidungen
- Eine Lektion = ein Ding, schneller Win, direkt am Mission-Pfad.
- Sicherheitskritische Schritte (z.B. SSH-Login sperren) IMMER mit
  "zweites Terminal offenlassen + testen bevor erstes geschlossen wird"-Safety.
- Lehre **systemd** als primären Weg Node zu betreiben; PM2 nur erwähnen.

## Curriculum-Arc (geplant, anpassbar)
1. ✅ SSH-Haustür absichern (sudo-User, Key-Auth, root+Passwort sperren)
2. ⬜ Firewall mit UFW (minimale offene Ports)
3. ⬜ Auto-Security-Updates (unattended-upgrades) + fail2ban
4. ⬜ User/Rechte/Ownership (chmod/chown, least privilege)
5. ⬜ Node sauber installieren (nodesource/nvm) + dedizierter App-User
6. ⬜ Node als systemd-Service (Restart, Boot, journalctl)
7. ⬜ Nginx Reverse Proxy
8. ⬜ TLS mit Certbot/Let's Encrypt
9. ⬜ Logs: journalctl, logrotate
10. ⬜ Secrets/Env-Variablen sauber
11. ⬜ Monitoring & Wartung (htop, Disk, Updates, Backups)
12. ⬜ Deploy-Workflow (git pull, Restart)

## Status
- Lektion 1 ausgeliefert. Noch keine Learning-Records (kein nachgewiesenes
  Können bisher — erst nach Demo/Quiz anlegen).
