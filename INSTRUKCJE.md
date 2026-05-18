# Instrukcje — Dodawanie nowych wykładów do portalu

## Struktura projektu

```
~/wyklady-hs/                         ← root (Mac Mini)
├── index.html                        ← portal główny (oba kursy)
├── historia_sztuki.html              ← indeks HS
├── 01_Swit_Odrodzenia/ … 11_*/      ← wykłady HS
└── filozofia/
    ├── index.html                    ← indeks Filozofii
    └── 01_Wprowadzenie/ … NN_*/     ← wykłady Filozofii
        ├── notatki.html
        ├── transkrypcja.txt
        └── ai_context.md
```

Lokalnie (MacBook): `/Users/janzablocki/Wykłady/`  
Mac Mini: `macmini@100.80.102.51:~/wyklady-hs/`  
Cloudflare tunnel: uruchomiony na Mac Mini, URL zmienia się przy każdym restarcie

---

## Workflow — nowy wykład Filozofia

### Krok 1: Pobierz nagranie z Google Drive

Nagrania Google Meet są **restricted** — yt-dlp i gdown nie mogą ich pobrać automatycznie.

**Opcja A — pobierz VTT z Meet:**
1. Otwórz nagranie na Google Drive w przeglądarce
2. Kliknij ⋮ → Pobierz (jeśli opcja dostępna)
3. Lub: w Google Meet po zakończeniu → sprawdź Google Drive → obok nagrania powinien być plik `.vtt` z napisami

**Opcja B — użyj narzędzia do ekstrakcji napisów:**
```bash
# Jeśli masz plik .mp4 lokalnie:
ffmpeg -i wyklad.mp4 -map 0:s:0 napisy.vtt

# Lub jeśli nagranie ma wbudowane napisy:
yt-dlp --cookies-from-browser chrome --write-auto-subs --sub-langs pl --skip-download "URL"
```

**Opcja B — pobierz napisy bezpośrednio (SPRAWDZONA METODA):**
```bash
# Używa cookies z Brave — działa dla nagrań Google Meet z transkrypcją!
yt-dlp --cookies-from-browser brave \
  --write-subs --write-auto-subs \
  --sub-langs pl \
  --skip-download \
  -o "/tmp/filozofia/wyklad_N/napisy" \
  "https://drive.google.com/file/d/PLIK_ID/view"
# → plik: /tmp/filozofia/wyklad_N/napisy.pl.vtt
```

### Krok 2: Oczyść transkrypcję

Jeśli plik jest w formacie VTT:
```bash
# Usuń znaczniki czasu i zduplikowane linie:
grep -v "^WEBVTT" napisy.vtt | grep -v "^[0-9]" | grep -v "^-->" | grep -v "^$" | sort -u > transkrypcja_czysty.txt
```

Jeśli plik jest już tekstem (format jak obecne transkrypcja.txt):
- Sprawdź czy zaczyna się od `Kind: captions` — to już czysty format, gotowe

### Krok 3: Umieść plik lokalnie

```
/Users/janzablocki/Wykłady/Filozofia/NN_NazwaWykladu/transkrypcja.txt
```

### Krok 4: Poproś Claude Code o wygenerowanie notatek

Wklej transkrypcję lub przekaż ścieżkę. Claude wygeneruje:
- `notatki.html` — ciemny motyw, sekcje, cytaty, schematy
- `ai_context.md` — ustrukturyzowana karta dla NotebookLM/AI

Podaj numer wykładu i temat (jeśli znany), np.:
> "Wykład 4, temat: Epistemologia — Kartezjusz i cogito ergo sum"

### Krok 5: Dodaj kartę do indeksu Filozofii

Edytuj `/Users/janzablocki/Wykłady/Filozofia/index.html`:
- Zmień licznik wykładów w `.stat .num`
- Dodaj nową `.lecture-card` (skopiuj istniejącą, zmień numer/tytuł/tagi/href)
- Nadaj klasę koloru: `.era-intro` (fiolet) / `.era-meta` (złoty) / `.era-jaspers` (niebieski) / `.era-na` (czerwony — niedostępny)

### Krok 6: Wyślij na Mac Mini

```bash
# Z folderu /Users/janzablocki/Wykłady/
rsync -av --exclude="*.mp4" --exclude="*.vtt" \
  Filozofia/ \
  macmini@100.80.102.51:~/wyklady-hs/filozofia/

# Zaktualizuj też portal główny jeśli zmieniono index.html:
scp index.html macmini@100.80.102.51:~/wyklady-hs/index.html
```

### Krok 7: Sprawdź Cloudflare tunnel

```bash
ssh macmini@100.80.102.51 "ps aux | grep cloudflared | grep -v grep"
```

Jeśli tunnel nie działa:
```bash
ssh macmini@100.80.102.51 "~/bin/cloudflared tunnel --url http://localhost:8080 --logfile /tmp/cf.log &"
sleep 5
ssh macmini@100.80.102.51 "grep -o 'https://[a-z-]*\.trycloudflare\.com' /tmp/cf.log | tail -1"
```

---

## Workflow — nowy wykład Historia Sztuki

Analogicznie, ale:
- Folder docelowy lokalnie: `/Users/janzablocki/Wykłady/Historia_Sztuki/`
- Folder na Mac Mini: `~/wyklady-hs/NN_NazwaWykladu/`
- Indeks: `/Users/janzablocki/Wykłady/Historia_Sztuki/index.html` (plik `historia_sztuki.html` na Mac Mini)

```bash
rsync -av --exclude="*.mp4" --exclude="*.vtt" \
  Historia_Sztuki/NN_NazwaWykladu/ \
  macmini@100.80.102.51:~/wyklady-hs/NN_NazwaWykladu/

scp Historia_Sztuki/index.html macmini@100.80.102.51:~/wyklady-hs/historia_sztuki.html
```

---

## Serwer HTTP na Mac Mini

```bash
# Sprawdź czy działa:
ssh macmini@100.80.102.51 "ps aux | grep 'http.server' | grep -v grep"

# Uruchom jeśli nie działa:
ssh macmini@100.80.102.51 "nohup python3 -m http.server 8080 --directory ~/wyklady-hs/ > /tmp/http.log 2>&1 &"
```

---

## Użyte narzędzia

- **yt-dlp**: `~/.pyenv/shims/yt-dlp` — pobieranie wideo/napisów
- **gdown**: `~/.pyenv/shims/gdown` — pobieranie z Google Drive
- **rsync**: synchronizacja plików na Mac Mini
- **cloudflared**: `~/bin/cloudflared` na Mac Mini — tunel Cloudflare
