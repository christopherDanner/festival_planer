# Mission: Linux-Server & Node-Backend sauber und sicher betreiben

## Why
Christopher betreibt (bzw. wird betreiben) ein Node-Backend auf einem eigenen
Hetzner-Server. Ziel: den Server selbst aufsetzen, absichern und langfristig
warten können — ohne sich auf Managed-Services oder Bauchgefühl zu verlassen.
Konkret soll am Ende ein Backend (Express/tRPC/egal) produktiv, sicher und
neustart-fest laufen, und er soll Probleme selbst diagnostizieren können.

## Success looks like
- Frischen Hetzner-Server in <30 Min produktionsreif absichern (SSH-Hardening,
  Firewall, Auto-Updates) — aus dem Kopf, ohne Tutorial nebenbei.
- Ein Node-Backend als systemd-Service betreiben: startet bei Reboot, restartet
  bei Crash, Logs per `journalctl` lesbar.
- Nginx als Reverse Proxy + TLS (Let's Encrypt) davorschalten.
- Secrets/Env-Variablen sauber handhaben (nichts im Git, korrekte Rechte).
- Bei einem Vorfall ("Server reagiert nicht", "Port offen", "Disk voll")
  systematisch debuggen statt neu aufsetzen.

## Constraints
- Vorkenntnisse: Grundlagen vorhanden (SSH-Login, navigieren, Pakete
  installieren) — aber unsystematisch, Server-Themen unklar.
- Lernstil: **hands-on**. Echte Befehle, selbst tippen, am echten Server.
- Arbeitet lokal auf Windows; Server ist Ubuntu (Hetzner Cloud/Dedicated).
- Konkretes Ziel-Setup: Hetzner-Server.

## Out of scope (vorerst)
- Kubernetes, Docker-Swarm, Container-Orchestrierung.
- Multi-Server / Load-Balancing / Hochverfügbarkeit.
- CI/CD-Pipelines (kommt evtl. später, erst Grundlagen).
- Cloud-Provider-spezifisches (AWS/GCP) jenseits von Hetzner.
