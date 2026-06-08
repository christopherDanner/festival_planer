# Linux-Server & Node-Backend — Resources

## Knowledge

- [Hetzner Community: Initial Server Setup with Ubuntu](https://community.hetzner.com/tutorials/howto-initial-setup-ubuntu/)
  Offizielle, plattformspezifische Anleitung für den ersten Login + Hardening.
  Use for: alles rund um frischen Hetzner-Server, sudo-User, UFW, SSH-Config.
- [Hetzner Community: Basic Cloud Config (cloud-init)](https://community.hetzner.com/tutorials/basic-cloud-config/)
  Server beim Boot automatisch konfigurieren (User, Updates, SSH-Hardening).
  Use for: später — Setup automatisieren statt manuell.
- [DigitalOcean: Initial Server Setup with Ubuntu](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu)
  Der Klassiker. Sehr saubere, gepflegte Schritt-für-Schritt-Erklärungen.
  Use for: sudo-User, UFW, SSH-Key-Setup, sshd_config — gegenchecken.
- [Node.js Docs: Deployment & Production](https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production)
  Primärquelle. Use for: NODE_ENV, Production-Verhalten.
- [DigitalOcean: How To Set Up a Node.js App for Production on Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-20-04)
  Use for: Node installieren, PM2 vs. systemd, Nginx Reverse Proxy.
- [Nginx Docs: Reverse Proxy / Load balancing Node.js](https://docs.nginx.com/nginx/deployment-guides/load-balance-third-party/node-js/)
  Primärquelle. Use for: korrekte proxy_pass / upstream-Konfiguration.
- [Let's Encrypt / Certbot Instructions](https://certbot.eff.org/instructions)
  Primärquelle. Use for: TLS-Zertifikate für die Domain, Auto-Renewal.
- [systemd.service man page (freedesktop.org)](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
  Primärquelle für Unit-Files. Use for: Node als Service, Restart-Policy.
- [Arch Wiki: Security / SSH keys](https://wiki.archlinux.org/title/SSH_keys)
  Distro-übergreifend hochwertig erklärt. Use for: SSH-Key-Verständnis.

## Wisdom (Communities)

- [r/selfhosted](https://reddit.com/r/selfhosted)
  Hoch-signalhafte Community für eigene Server. Use for: Setup-Review,
  "mache ich das richtig?", Troubleshooting echter Probleme.
- [r/sysadmin](https://reddit.com/r/sysadmin)
  Use for: tiefere Server-/Ops-Fragen, Best Practices aus der Praxis.
- [Hetzner Community Forum](https://forum.hetzner.com/)
  Use for: Hetzner-spezifische Fragen (Netzwerk, Firewall-Cloud-Console).

## Gaps
- Noch keine deutschsprachige Primärquelle verlinkt (Lektionen sind DE, Quellen
  mehrheitlich EN). Bei Bedarf ergänzen.
