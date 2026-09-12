# HOME — játékterv

3 napos game jam. Téma: **HOME**.
Böngészős játék, p5.js, statikus hosting (GitHub Pages), nincs build lépés.

---

## 1. Áttekintés

Izometrikus, rácsalapú, narratív fejtörőjáték egyetlen házban.

A játékos felnőttként tér vissza a szülői házba, ami épp kiürül. Minden szobában át lehet váltani a **jelen** és egy **múltbeli életkor** közé. A két idősík között váltogatva kell megoldani egy-egy fejtörőt, miközben egy szentimentális, szomorú történet bontakozik ki.

Négy szoba + egy folyosó. A szobák tetszőleges sorrendben játszhatók, egy kivétellel. Minden szoba egyszer oldható meg.

---

## 2. A központi szabály

> **A gyerek cselekszik. A felnőtt megtalálja.**

Múltban van hatalmad változtatni: elrejtesz, odateszel, elveszítesz valamit.
Jelenben **nem tudsz változtatni a múlton** — csak keresni, amit ott hagytál.

Egy szoba akadálya felnőttként megoldhatatlan, amíg át nem mész a múltba, meg nem teszed az apró tettet, és vissza nem jössz.

Ez egyszerre mechanika és mondanivaló. Kódban szobánként egy-két flag.

---

## 3. Szerkezet

### Folyosó (hub)

Nem csak pályaválasztó, hanem a **történet mérőórája**.

- Van rajta egy fogas: múltban négy kabát, jelenben kettő.
- Minden megoldott szoba után, a folyosóra visszatérve **egy dolog megváltozik**: egy újabb doboz, egy leszedett kép helyén maradó világos folt, egy kabáttal kevesebb.
- A narratív eszkaláció **a megoldott szobák számához** kötődik, nem a szobák identitásához. Ezért működik szabad sorrendben.

### Szobák és életkorok

| Szoba | Életkor | Fejtörő típusa |
|---|---|---|
| Szülők hálószobája (bölcső) | baba | **tér** — tolós fejtörő |
| Nappali (TV, SNES, kanapé, könyvek, fakocka) | óvodás | **információ** — következtetés |
| Gyerekszoba (füzetek, gitár, XBOX) | iskolás | **sorrend** — állapotgép |
| Ebédlő + konyha (a bemutatás) | kamasz / egyetemista | **logika** — ültetési rend |

Az ebédlő a csúcspont, **a negyedik megoldás után nyílik**. A többi három szabadon.

### Miért négy különböző fejtörőtípus

Szabad sorrendnél **egyik szoba sem építhet arra, amit egy másik megtanított.** Nincs nehézségi görbe. Ezért nem ugyanazt a fejtörőt adjuk négyszer más díszlettel, hanem négyféle gondolkodást, ugyanazzal az igerendszerrel.

---

## 4. Igerendszer

Az **egész játékban négy ige** van, és **egyik szoba sem kap saját új mechanikát**:

- **Menj** — rácslépés
- **Nézd** — a felnőtt én narrál egy tárgyat
- **Használd** — egy szkriptelt akció tárgyanként
- **Told / húzd** — csak a hálószobában

Nincs ige-kombináció (használd X-et Y-on). Az minden párosításhoz egyedi szöveget igényelne, és tíz tárgynál száz cellát ad, amiből kilencven fölösleges elutasítás.

**A kombinatorika a második tengelyről jön: az idősíkról.** Ugyanaz a tárgy, ugyanaz az ige, két korszak, két jelentés. Ez ingyen duplázza a tartalmat.

---

## 5. Vizuális terv

### Egy plate, sok réteg

Szobánként **egy üres izometrikus plate** (padló, falak, ablak — bútor nélkül), és minden bútor **külön réteg**, polygonnal kivágva, saját pozícióval.

Ebből következik minden:

- Ha egy tárgy nincs ott a jelenben, nem rajzoljuk. Mögötte az üres plate. **Nincs lyuk a háttérben.**
- A kivágott rétegek kitakarják a figurát, ha mögé áll → teljes az illúzió, és a bútor kattintható/interaktálható.

### A két korszak ugyanaz a geometria

**Ne generálj két külön képet ugyanarról a szobáról.** Két generálás sosem lesz egy pixelre ugyanaz, a kivágási munka duplázódik, a váltás rángatni fog.

Helyette: azonos plate + azonos rácsgeometria, és a különbség
- **színkorrekció** (jelen = deszaturálás, sötétítés, szürke fátyol),
- **más rétegkészlet** (pár tárgy le- és felcserélve, dobozok a bútorok helyén).

Így a váltás képen belüli átúsztatás, nem vágás: a kamera nem ugrik, a járható terület azonos.

Összes alapgenerálás: **5 plate**. A bútorok jöhetnek külön generálásokból, azokat úgyis kivágjuk.

### A szereplők sziluettek

Öt életkor × négy póz = 20 sprite, amiknek felismerhetően ugyanaz az ember kell hogy legyen. Ez az, amiben a képgenerátorok a leggyengébbek, és közben a figura az idő 100%-ában a képernyőn van.

Megoldás: **tömör, sötét, részlet nélküli sziluettek.** Színes, gazdag szobák, bennük fekete alakok.

- A konzisztencia-probléma megszűnik: az életkor a méretből és az arányokból jön, nem az arcból.
- Kézzel vagy kódból (poligonokkal) is megrajzolható → a nyújtós-döntögetős animációhoz saját pontjaid vannak, nem egy raszter sarkai.
- Az emotikon a fej fölött lesz **az egyetlen érzelmi csatorna** — ez erő, nem hiány.
- Tematikusan pontos: az emléknek nincs arca.

*B-terv, ha túl absztrakt:* kis figura (60–80 px) hátulnézetből.

### Animáció

Statikus pózok (áll, ül, fekszik, hozzáér) + nyújtás és döntögetés a lépegetéshez, lélegzéshez. Emotikonok a fej fölött: álmos, mérges, zavarodott, énekel, ideges.

**Két rajz elég négy irányhoz.** Izometriában `+x` és `+y` is kamera felé néz, `-x` és `-y` el — tehát egy „felénk" és egy „háttal" póz, vízszintes tükrözéssel mind a négy megvan. A pózkészlet 20-ról 10-re esik.

---

## 6. Szín-szabály

Kétféle szín, két különböző feladattal:

**Horgonyszín** — szobánként **egy** tárgy, ami **mindkét idősíkban** megtartja a színét. A hálószobában a bölcső. Ez nem hint, hanem a kapocs: a játékos megtanulja, hogy ami mindkét korban színes, az az átjáró.

**Aktív szín** — egyszerre **pontosan egy** másik tárgy telített: amivel most dolgod van. Jelenben a következő olvasható doboz, múltban a guruló tárgy. Ha megoldódott, kiszürkül, és a szín átköltözik a következőre.

> **Egyszerre csak egy aktív szín létezhet.** Ha három dolog is színes, a szín megszűnik információ lenni. Egy színnel viszont nem kell felkiáltójel, csillogás, tutorial, semmi.

A jelen deszaturálása így nem csak hangulat, hanem a szabály hordozója.

**Elakadás-kezelés:** ha a játékos sokáig nem halad, a következő lépéshez tartozó tárgy színe térjen vissza. Ez a teljes hint-rendszer.

---

## 7. Irányítás

Négyirányú rácsmozgás. Izometrikus nézetben nem minden padlóelem kattintható (kitakarás, egymásra pakolt dobozok), ezért nincs pathfinding kattintásra.

**PC:** nyilak vagy WASD, `Space` = interakció, `Shift` + irány = húzás.
**Mobil:** swipe, állandó akciógomb jobb alul, mellette fogás gomb.

### Irányleképezés

A 2:1-es izometriában a `+x` jobbra-le, a `-y` jobbra-fel megy — mindkettő nagyjából „jobbra". Egy swipe szögéből nem lehet egyértelműen visszafejteni. **Ne próbáld intuitívabbra csinálni, csak konzisztensre:**

```
jobbra → (+1,  0)      balra → (-1,  0)
le     → ( 0, +1)      fel   → ( 0, -1)
```

### Interakció

Nincs tárgyra kattintás — az ugyanabba a kitakarási problémába futna.

A figura mindig néz valamerre. Ha a nézett irányban a szomszédos mezőn interaktálható tárgy van, **halkan kiemelődik** (kontúr felvillan, vagy egy pont fölötte). Akciógomb → megtörténik. A kiemelés ingyen megmondja, mivel lehet egyáltalán kezdeni valamit.

A lépés sorbaállított, nem azonnali: ~160 ms lépésenként, futó animáció alatt a következő input várakozik.

---

## 8. Tolás, húzás, undo

### Tolás

**Nem külön parancs — belesétálsz.** Ha a lépés irányában tolható tárgy van, a lépés tolássá válik.

Szabályok:

1. Minden tárgynak van **alaprajza** a rácson: 1×1, 2×1, vagy L. Tolásnál az egész alaprajz csúszik egy mezőt. **Forgatás nincs.**
2. A figurának állnia kell tudnia a tolás irányával szemközti élen. L-alaknál ez több mező is lehet → a motor a legközelebbit választja, a játékosnak nem kell pozicionálnia.
3. **Nehéz bútor csak a hossztengelye mentén tolható.** A szekrény oldalirányba csúszik, előre-hátra nem. Egy sor kód, és a nagy tárgyak irányított akadállyá válnak, nem csak tömeggé.
4. **Két egymásra rakott doboz nem tolható — de rá lehet állni.** A halom egyszerre akadály és eszköz. Egy elem, két ellentétes funkció.
5. Van, ami nem mozdul: ágy, szekrény a jelenben, falak.

**Az egymásra pakolás nem játékosi képesség** — a halmok eleve úgy állnak ott. Így a halom tiszta bemenet, nem művelet, és nem kell emelést megoldani inputban.

### Húzás

**Csak 1×1-es dobozok húzhatók.** L-alaknál a húzás kétértelmű (a figura előtte áll, több lehetséges fogópont), és a játékos sem tudná fejben követni, melyik élt fogta meg. Egy sornyi feltétel kizárja az összes problémás esetet.

A figura a doboz mellett áll, felé néz, és a magától elfelé mutató irányba lép — a doboz követi. Feltétel: a figura mögötti cella szabad.

### Undo, nem reset

A reset bünteti a kísérletezést — pont azt a játékost, aki próbálgatva tanul. És mivel nincs tanulási görbe (szabad sorrend), a próbálgatás itt a tervezett megismerési mód.

- Állandóan látható gomb (balra kanyarodó nyíl), nem gesztus.
- **Tartásra pörögjön vissza az elejéig** — ez a reset, külön UI nélkül.
- Nincs lépéskorlát, nincs lépésszámláló.
- **Csak tolás és húzás előtt** menteni, sima lépésnél nem — különben a gomb végigsétáltatja a szobát.
- **A figura pozícióját és irányát is menteni kell**, nem csak a tárgyakét, különben teleportálásnak látszik.

Vizuálisan: a múltban egy halk kattanás és gyors, fordított mozgás — *az emlék javítja ki magát.*

---

## 9. Szobatervek

### 9.1 Hálószoba — bölcső (baba) · **tér**

Ez a mintaszoba. Minden más ebből az elemkészletből épül, kevesebb tartalommal.

**Jelen.** A bölcső dobozok útvesztőjében áll, a szülői ágy helyén. Bármelyik dobozra hatva a felnőtt én elmondja, mi van benne, egy szentimentális megjegyzéssel:

> *Apa cuccai — nyakkendők, fehér ingek és két nadrág. A pipája is itt van, sose használta.*

Az **egyik doboz szövege említsen egy hiányzó tárgyat**: valami, ami sosem került elő.

**Átváltás.** A bölcsőhöz érve azonnal váltunk az emlékre.

**Múlt.** Babaként alig van hatalmad: mászol, a karod rövid. Interaktálható a szülői ágy, az éjjeliszekrény, a ruhásszekrény és egy földön hagyott tárgy — mindegyikre a felnőtt én narrál egy részletet a történetből.

Kergetsz egy guruló tárgyat. Ez **pontosan az, ami a dobozból hiányzik** — apáé. Kritérium: guruljon, csillogjon (ezért nyúl utána a baba), és egy felnőtt férfi hordja magánál. **Öngyújtó vagy zsebóra** (a karikagyűrű izometrikus nézetben túl kicsi lesz ahhoz, hogy lásd gurulni).

A tárgy végül begurul egy bútor alá és elveszik → **gyereksírás** → vissza a jelenbe.

**A sírás legyen rövid és tompa.** Egy másodperc, aztán vágás, és a jelenben **csönd** — se zene, se szobahang. A kontraszt csinálja a hatást, nem a hangfájl hossza.

**Megoldás.** A bútor még mindig ugyanott áll. A dobozokat el kell tolni, hogy hozzáférj.

**Fejtörő mérete:** 3–4 doboz, 5–6 lépés, ~7×7 járható rács. Ez nem sokoban-játék, hanem egy hangulati jelenet, aminek a formája tolós fejtörő. Ha a tesztelő 20 másodpercnél többet tölt vele, túl nagy.

**A szál:** ugyanaz a három rendszer (dobozvizsgálat, kergetés, tolás) egyetlen tengelyre fűzve — a végén azért tolod el apa dobozait, hogy megtaláld, amit tőle vettél el, és sosem adtál vissza.

### 9.2 Nappali (óvodás) · **információ + doboz-sokoban**

**Horgonyszín.** A könyvespolc — mindkét idősíkban megvan, megérintve vált a jelen és a múlt között, ahogy a bölcső a hálószobában.

**Jelen.** A könyvespolc félig kiürült, a könyvek fele már bedobozolva — **ugyanazok a doboz-entitások/sprite-ok**, mint a hálószobában (1×1 és 2×1, `Nézd` mindegyiken egy-egy könyv leírását adja: szín, cím-töredék, állapot). Új szabály csak ebben a szobában: **doboz dobozra tolható** — ha a tolás célcellája már foglalt egy másik tolható dobozzal, a doboz arra csúszik (z+1), nem blokkol. Ez az egyszerűbb megoldás a kettő közül, amit felvetettél (dobozok egymásra tolása vs. egymáson áttolás) — a meglévő "két egymásra pakolt doboz nem tolható tovább, de rá lehet állni" szabály változatlan marad, csak a *létrehozás* módja új: eddig a stack eleve úgy állt ott, most a játékos maga rakja egymásra őket, hogy helyet csináljon.

**Átváltás.** A könyvespolcot megérintve visszahúz az emlék.

**Múlt.** Az óvodás a kis dohányzóasztalnál ül, épp befejezte a rajzot (**induló póz: ülő**, nem álló — az első mozgás vagy interakció állítja fel). Interaktálható tárgyak:

- **Nézd** a kanapén, a virágokon — hangulati szövegek.
- **Nézd** a TV+NES egységen: *"A kedvenc játékom az Ice Climber."*
- **Használd** a dohányzóasztalon heverő rajzon → felveszed (`hasDrawing = true`, a rajz-entitás eltűnik az asztalról; nincs általános inventory, csak ez az egy flag).
- A **puff** (kis ülőbútor) egy önálló, tolható 1×1 entitás — ugyanaz a told-mechanika, mint a dobozoké. A könyvespolchoz kell tolni.
- Rááll/felmászik a puffra (a doboz-rááll logika, z+1), és **Használd** a polcon → elrejti a rajzot a könyvek között (`drawingHidden = true`), majd rövid toast-lánc után automatikusan vissza a jelenbe (mint az óránál).

**Kanapé/puff — ülés.** Interakció a kanapén vagy a puffon (ha a szereplő azok mellett áll és feléjük néz) leülteti a szereplőt (ülő póz, a te új sprite-od); bármelyik következő mozgás- vagy interakció-input feláll.

**Háttérveszekedés.** Amíg a múlt-jelenetben vagyunk, az ajtó felől kis betűméretű, ismétlődő szövegcsík fut be időzítve (nem a fő toast-rendszer — külön, halkabb UI elem), 6–8 sorból ciklikusan: anya veszekszik, kifakad, megfenyegeti a gyereket ("ha összefirkálod a bútort, elverlek"), apa próbál csendesíteni. Sose old meg semmit, csak hangulat és nyomás — a gyerek eközben csinálja a magáét.

**Megoldás.** A jelenben a rajz előkerül (a polcnál vagy a dobozok között): a felnőtt elmeséli, hogy a saját családját rajzolta le — ő, apa és a kutyus az egyik oldalon, anya a lap másik oldalán, mindenki mosolyog. A kontraszt a múltban hallott veszekedéssel csinálja a hatást.

**Fejtörő mérete:** a dobozrész hasonló léptékű, mint a hálószobai (pár doboz, néhány lépés); a múltbeli rész egy rövid script-lánc (rajz felvétele → puff a polchoz → felmászás → elrejtés), nem külön térbeli fejtörő.

**A szál:** a gyerek, miközben a szülei az ajtón túl veszekednek, egy boldog családi rajzot rejt el a könyvek közé — a felnőtt ezt találja meg a kiürülő házban, évekkel később.

**Motor-kiegészítések ehhez a szobához** (újak a hálószobához képest):
1. Doboz-egymásra-tolás (fent).
2. Felvehető tárgy: egyetlen boolean flag + entitás eltüntetése, nincs általános inventory.
3. Másztálható bútor (puff): a doboz z+1-es rááll-logika, külön push+climb entitásként.
4. Ülő póz + automatikus felállás: a szereplőn egy `sitting` state, bútor-interakcióval be, bármilyen input ki.
5. Háttér-dialógus csík: ismétlődő/ciklikus rövid szövegek az ajtó felől, a fő toast-rendszertől függetlenül, csak amíg `era === 'past'` ebben a szobában.

### 9.3 Gyerekszoba (iskolás) · **sorrend**

Valamit el kell rejteni, mielőtt anya belép. Négy dolog van kint, három helyre fér el, és **a sorrend számít**: az egyik rejtekhely csak azután szabadul fel, hogy egy másikat használtál.

Tiszta állapotgép, négy **Használd**. Nincs új mechanika — a gitár megrázása (a hangnyíláson betolt fecni miatt) is csak egy **Használd**.

### 9.4 Ebédlő + konyha (kamasz / egyetemista) · **logika**

A csúcspont, itt kell a legkevesebb fejtörő. **Megterítesz.** A feladat: hány személyre, és ki hova ül.

Kis kényszerkielégítési feladat — valaki nem ülhet valaki mellé, valaki nem jön el. A megoldás maga a történet csattanója.

Felnőttként ugyanaz az asztal, **egy székkel kevesebb.**

Mechanika: négy **Használd** négy széken. **Nem drag-and-drop.**

---

## 10. Technikai specifikáció

### Entitásmodell

Egyetlen lista: bútor, doboz, dekor, a szereplő is.

```js
{
  id: 'sofa',
  cells: [{dx:0,dy:0},{dx:1,dy:0},{dx:1,dy:1}], // alaprajz, origóhoz képest
  x: 3, y: 2, z: 0,
  height: 1,           // hány z-szintet foglal
  push: 'axis',        // false | 'any' | 'axis'
  axis: 'x',
  pull: false,         // csak 1 cellás dobozoknál true
  stackable: true,     // lehet-e rá állni / rakni
  blocking: true,
  interact: 'look',    // 'look' | 'use' | null
  era: 'both',         // 'past' | 'present' | 'both'
  draw: drawBox        // cserélhető rajzfüggvény
}
```

A `draw` most placeholder függvényre mutat. **A logika soha ne hívjon rajzolást közvetlenül** — amikor megjön a grafika, csak ez az egy mező cserélődik.

### Izometrikus transzformáció

```js
const TW = 64, TH = 32, ZH = 24;  // cella szélesség, magasság, egy z-szint

const sx = (x, y)    => (x - y) * TW / 2;
const sy = (x, y, z) => (x + y) * TH / 2 - z * ZH;
```

A `ZH` **ne** legyen `TH` fele vagy egyenlő vele — akkor egy megemelt doboz vizuálisan pont egy szomszédos cellára esne, és nem lehetne ránézésre eldönteni, magasan van-e vagy hátrébb.

### Rajzolási sorrend

Minden **cellát** külön rajzolunk, nem entitást — ezért kell a többcellás tárgyakat feldarabolni.

```js
const depth = (x + y) * 1000 + z * 10 + layer;
```

`layer`: 0 = padló, 1 = szőnyeg/dekor, 2 = tárgy és szereplő. Növekvő sorrendben. A szereplő ugyanebbe a listába megy, saját `(x,y,z)`-vel — nincs külön ág rá.

A `z` oldja meg az egymásra pakolt dobozokat: azonos `(x+y)` sor, de a `z` szétválasztja. Ha a figura a halom tetején áll, `z=1`, tehát automatikusan a saját mezője alatti doboz *után* rajzolódik.

### Járhatóság

```js
function standable(x, y, z) {
  if (!inBounds(x, y)) return false;
  if (occupied(x, y, z)) return false;
  if (z === 0) return true;
  const below = entityAt(x, y, z - 1);
  return below && below.stackable;
}
```

Lépéskor, ha a célcella `z`-jén nem áll meg, de `z+1`-en igen, **automatikusan felmászik** (és fordítva, lelép). Nincs külön ugrásgomb.

### Tolás validáció

```js
function canPush(e, dir) {
  if (!e.push) return false;
  if (e.push === 'axis' && axisOf(dir) !== e.axis) return false;
  if (hasAnythingOnTop(e)) return false;              // 2 emelet doboz nem tolható
  for (const c of worldCells(e))
    if (!freeForMove(c.x + dir.x, c.y + dir.y, c.z, e)) return false;
  return actorCanReach(e, opposite(dir));             // van hova állnia mögé
}
```

Az `actorCanReach` L-alaknál végigmegy a szemközti oldal összes celláján, és a legközelebbi érvényesre sétál.

### Undo snapshot

```js
function snapshot() {
  return {
    actor: {x: actor.x, y: actor.y, z: actor.z, facing: actor.facing},
    ents: movables.map(e => ({id: e.id, x: e.x, y: e.y, z: e.z}))
  };
}
```

---

## 11. Asset pipeline

### Sorrend

1. **Kameraszög és rácsméret rögzítése** — mielőtt bármit generálsz.
2. Plate generálás (5 db), **mind az ötöt szó szerint ugyanazzal a leírással**, ugyanazokkal a szavakkal.
3. Iso rács ráhelyezése a plate-re.
4. Bútorok kivágása polygonnal, a rácsvonalakhoz illesztve.
5. Rétegadat export (pozíció, alaprajz, magasság).
6. Jelen-változat: színkorrekció + rétegcsere.

### A vágásról

**A vágásvonal nem függőleges a képernyőn.** Két szomszédos mező határa izometriában átlós, és egy magas tárgynál ez az átlós vonal fölfelé kihúzva adja a helyes vágást. Függőleges vágásnál a darabok rossz mezőhöz tartoznak, és a figura hol belelóg, hol lebeg.

**Rajzold rá az iso rácsot a plate-re, mielőtt vágni kezdesz.** Ez az egy dolog megspórol egy teljes estét a harmadik napon.

Ugyanez a szabály miatt érdemes **minden többmezős tárgyat feldarabolni**, a 2×1-est is — egy szabály, nulla kivétel.

### Ha raszter assetet generálsz

Ne külön assetenként kérd, hanem **egyetlen sprite sheetet**, rácsba rendezve, egységes háttéren. Egy generálás = garantáltan konzisztens stílus, és kódból vágod ki koordináta szerint.

### Kameraszög

A dőlés meghatározza, mennyit látsz a bútorok tetejéből, és ezzel azt is, mennyire működik a kitakarás. Túl laposnál a figura alig bújik el, túl meredeknél nincs mi mögé állni.

---

## 12. Infrastruktúra

- **Nincs build lépés.** `index.html`, p5.js CDN-ről, `assets/` mappa. Ha az agent Vite-ot vagy npm buildet húz be, a játék egy CI pipeline-tól függ, és azt telefonról debugolni rossz.
- **GitHub Pages** a demóhoz — minden pushra frissül, böngészőben játszható link.
- **`CLAUDE.md`** a repóban: design, fájlstruktúra, „nincs build lépés" szabály, paletta, asset-elnevezési konvenció. Három nap alatt sok session lesz; e nélkül az agent driftel (átnevez, framework-öt vezet be, átírja a mappaszerkezetet).
- **Minden működő állapotot azonnal commitolni.** Érdemes a Pages-t külön, csak működő buildeket tartalmazó branchről kiszolgálni — így mindig van élő, játszható verzió, akkor is, ha a fő ág szét van esve.

---

## 13. Ütemterv

A napi bontás azon áll, hogy a **PC-s és a mobilos munka szét van választva**.

- **PC-s blokkok** (csak gépen): plate-generálás, kivágás a tooollal, rétegadat-export.
- **Mobil blokkok** (chatben iterálható): motor, feladatlogika, szövegek, hangulat.

| Nap | PC | Mobil |
|---|---|---|
| **1.** | A hálószoba teljes asset-lánca: plate, kivágások, rétegsorrend, jelen-változat | Rácsmozgás, mélységi rendezés, korszakváltás, tolás + undo |
| **2.** | A maradék 3 szoba + folyosó assetei | Feladatlogika szobánként, folyosó-mérőóra, szövegek |
| **3.** | — | Emotikonok, nyújtós animáció, hang, cím- és záróképernyő, build |

**A 3. nap délutánja üres.** Tartalék.

### Vágási sorrend, ha csúszol

1. Szobaszám 4 → 3: **a nappali esik ki** (az ovis korosztály a leggyengébb narratív beat). Marad hálószoba, gyerekszoba, ebédlő.
2. Az emotikonok maradjanak statikusak.
3. A nyújtós animáció essen ki teljesen — egy jól elhelyezett sziluett álló pózban is működik.

> **A folyosó-mérőórát ne vágd ki.** Az a legolcsóbb és a leghatásosabb elem az egészben.

### Nem tárgyalható

- A szobát **bármikor el lehet hagyni**, félbehagyott fejtörővel is, a részmegoldás megőrzésével. Jamen senkit nem szabad beszorítani, és négy szoba + szabad sorrend pont attól működik, hogy nem lehet benne elakadni.

---

## 14. Nyitott kérdések

- [x] **Rácsméret és kameraszög** — lezárva. A hálószoba plate-jét (`assets/room/halo.png`) kézzel bemérve: hátsó csúcs `(720, 395)`, bal `(95, 650)`, jobb `(1300, 655)`, elülső `(724, 1000)`. Ebből `DIAMOND_W = 1205px`, `DIAMOND_H = 605px`, `N = 7` → **`TW ≈ 172.1px`, `TH ≈ 86.4px`, arány 1.99:1 — gyakorlatilag pontos 2:1**. A motorban ezeket az értékeket (kerekítve `TW=172, TH=86`) használjuk közvetlenül, natív art-felbontáson, nem a korábbi `64/32` placeholder skálán. `ZH` erre `64` (nem fele és nem egyenlő `TH`-val). Lásd `tools/measure_plate.py` és `tools/composite_test.py`.
- [ ] A padlóminta illeszkedjen a rácshoz, különben a dobozok látszólag a semmiben állnak meg.
- [ ] A kergetett tárgy véglegesítése (öngyújtó vs. zsebóra).
- [ ] A jam beadási felülete: itch.io vagy elég a Pages link? (itch feltöltés telefonról macerás.)
