# Chronik

## Zweck & Links

- Chronik aller Repos in `~/dev`: Geburtsstunden (erster Commit), Releases (Versions-Tags), Commits pro Tag und kuratierte Meilensteine. Ansichten Zeitstrahl, Spuren, Kalender.
- https://chronik.pleasance.org, nur aus dem Tailnet.
- Coolify auf VPS 3: Projekt `privat-chronik`, Dienst `chronik` (nginx, Volume `chronik-site`). Betrieb und DNS: `~/dev/kontor/infra.md`.
- Gebaut wie `robinchoice/agents`. Farbe und Zeichen nach `~/dev/starter/DESIGN.md` (Band 4,45–5,00).

## Checks

`python3 collect.py > /dev/null && bash -n publish.sh && node -e "new Function(require('fs').readFileSync('site/app.js','utf8'))"`

## Deploy

- Ein Push sichert nur den Code, er deployt nichts.
- `./publish.sh` sammelt die Daten neu und kopiert `site/` mit `data.json` per rsync ins Volume auf VPS 3. Automatisch stündlich über `chronik-publish.timer` (aus `systemd/` nach `~/.config/systemd/user` verlinkt).
- Prüfen: `systemctl --user status chronik-publish.service`, dann https://chronik.pleasance.org im Tailnet laden.

## Meilensteine pflegen

- `milestones.jsonl`, eine Zeile pro Eintrag: `{"at": "2026-10-05 13:14", "repo": "kontor", "kind": "milestone", "title": "VPS 3 aufgesetzt", "big": true}`.
- `repo` ist der Ordnername in `~/dev`. `kind`: `milestone`, `move` (Umzug von Diensten) oder `release`. Ein `release` mit `"tag": "v0.6.0"` ergänzt nur die Beschreibung des Tags aus Git.
- `big` markiert Höhepunkte, die der Filter „Nur Höhepunkte“ zeigt. Titel auf Deutsch, kurz, ohne Commit-Jargon.
- Geburten und Releases nicht von Hand eintragen, die kommen aus Git. Stimmt der erste Commit nicht mit der echten Geburt überein, in `projects.json` `born` und `bornNote` setzen.

## Fallen

- `site/data.json` gehört nie ins Repo, sie entsteht beim Publizieren.
- Neue Repos erscheinen von selbst, grau und unter ihrem Ordnernamen. Anzeigename und Produktfarbe (Mitte des Ausschnitts aus DESIGN.md, `band` für das ganze Farbband) in `projects.json`. `hidden: true` blendet ein Repo aus.
- Texte der Oberfläche stehen in `site/app.js` unter `T.de` und `T.en`, neue immer in beiden Sprachen.
- Der Router `chronik-tailnet` in `/data/coolify/proxy/dynamic/tailnet-only.yaml` auf VPS 3 zeigt fest auf den Container `chronik-64ygimrpu96g7jtxbf3uhg8k`. `publish.sh` kennt den Volume-Namen.
