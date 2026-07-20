# Narrativ-Review — Veyra-Bogen (Deutsch)

Prosa-Review ohne JSON-Kontakt. Für jede Passage steht der aktuelle Text als **ORIGINAL** (nur Referenz, nicht ändern) und darunter ein leeres **NEU:**-Feld. Trage Überarbeitungen ausschließlich in **NEU** ein; ein leeres NEU-Feld lässt die Quelle unverändert. Sprecher, Bedingungen und Effekte sind **read-only** Kontext. Reihenfolge = erzählerischer Ablauf (Unlock-Kette), nicht Dateireihenfolge. Anker (`<!-- key: … -->`) nicht verändern — sie steuern den Rückspiel-Konverter (siehe README am Ende).

Generiert aus `src/data/content/events.json` + `missions.json`. Stand: siehe PR.

---

## 1. Intro

_Auto-Start bei `newCampaign` (Tag 1, kein MissionDef, Trupp = alle Start-Helden)._

### Event: Erster Tag (`ev_intro`) · Einstieg `n_in_sign`

#### Knoten `n_in_sign`

<!-- key: ev_intro::node::n_in_sign::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ich wusste nicht, was mich erwartete, als ich unterschrieb. „Geheime Versetzung. Annehmen oder ablehnen.“ Keine Einweisung, keine Einzelheiten — nur eine Unterschriftszeile und ein wartender Wagen. Womit ich gewiss nicht gerechnet hatte: mitten in einen Science-Fiction-Comic zu treten. Interstellare Reisen durch einen leuchtenden Ring. Nun. Das ist neu. ... Seit Cassy fort ist, kann ich die Arbeit gebrauchen. Vielleicht mehr noch den Abstand.

**NEU:**

> Ich wusste nicht, was mich erwartete, als ich unterschrieb. „Geheime Versetzung. Annehmen oder ablehnen.“ Kein Briefing, keine Einzelheiten — nur eine Unterschriftszeile und ein wartender Wagen, eigentlich nichts neues, aber irgendwas schien anders....
> Aber mitten in einen Science-Fiction-Comic geworfen zu werden, damit hatte ich sicherlich nicht gerechnet.
> Interstellare Reisen durch einen leuchtenden Ring? Nun, das ist neu. Funktionsweise? Unklar, Herkunft? Unbekannt.
> Egal, seit Cassy fort ist weiß ich ohnehin nicht was ich tun soll, da kann ich die Arbeit gebrauchen. Vielleicht mehr noch den Abstand.

##### Option `o_in_down` (auf Knoten `n_in_sign`)

<!-- key: ev_intro::node::n_in_sign::option::o_in_down::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_in_ring`_

**ORIGINAL:**

> Hinunter.

**NEU:**

#### Knoten `n_in_ring`

<!-- key: ev_intro::node::n_in_ring::text -->

- _Sprecher: —_

**ORIGINAL:**

> Vierhundert Meter tief hängt der Ring in seiner Halterung wie ein angehaltener Atem. Seit heute Morgen gehört er mir — samt einem Budget, das sagt, das Konsortium erwartet nichts. Dr. Okafor wartet mit einem Adressverzeichnis. Captain Mercer wartet mit einer Waffenliste. Alle hier unten warten auf mich. Erster Tag. Kein Druck.

**NEU:**

> Vierhundert Meter tief in einen verlassen Bergwerk.
> Da hängt der Ring in seiner Halterung, also würde er den Atem anhalten. Keine Bewegung, und doch hat man das Gefühl, dass jeden Moment etwas passieren würde. Seit heute Morgen unter meinem Kommando — samt einem Budget das seines Gleichen sucht. Zwei Soldaten, Dr. Okafor und Captain Mercer warten sichtlich ungeduldig im Briefing Room, scheint als waere keine Zeit zum auspacken. Wen ich zuerst anhöre wird sicherlich bemerkt werden.

##### Option `o_in_science` (auf Knoten `n_in_ring`)

<!-- key: ev_intro::node::n_in_ring::option::o_in_science::text -->

- _Bedingungen: keine_
- _Effekte: intel +4_
- _→ Knoten `n_in_okafor`_

**ORIGINAL:**

> Mit der Wissenschaft beginnen. Erst Okafor.

**NEU:**

##### Option `o_in_threats` (auf Knoten `n_in_ring`)

<!-- key: ev_intro::node::n_in_ring::option::o_in_threats::text -->

- _Bedingungen: keine_
- _Effekte: materials +4_
- _→ Knoten `n_in_mercer`_

**ORIGINAL:**

> Mit den Bedrohungen beginnen. Erst Mercer.

**NEU:**

#### Knoten `n_in_okafor`

<!-- key: ev_intro::node::n_in_okafor::text -->

- _Sprecher: —_

**ORIGINAL:**

> Dr. Okafor entschlüsselte die Adressnotation in sechs Wochen. Das Essay nennt sie unentbehrlich, unermüdlich und anstrengend. Mit zwei davon komme ich klar. Sie reicht mir das Briefing, das sie fertig hatte, ehe ich darum bat: einundfünfzig Adressen, eine gewählt. Recon One sprang vor elf Tagen zu Adresse 04. Zwei Meldungen — atembare Luft, Terrassenfelder, ein Dorf an einer weißen Straße — dann neun Tage nichts.“

**NEU:**

> Dr. Okafor entschlüsselte die Adressnotation in sechs Wochen. Das Essay nennt sie unentbehrlich, unermüdlich und anstrengend. Mit zwei davon komme ich klar. Sie reicht mir das Briefing, das sie fertig hatte, ehe ich darum bat: einundfünfzig Adressen, eine gewählt. Recon One sprang vor elf Tagen zu Adresse 04. Zwei Meldungen — atembare Luft, Terrassenfelder, ein Dorf an einer weißen Straße — dann neun Tage nichts.“

##### Option `o_in_okafor_then` (auf Knoten `n_in_okafor`)

<!-- key: ev_intro::node::n_in_okafor::option::o_in_okafor_then::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_in_mercer_2`_

**ORIGINAL:**

> Jetzt die Bedrohungen. Mercer.

**NEU:**

#### Knoten `n_in_mercer`

<!-- key: ev_intro::node::n_in_mercer::text -->

- _Sprecher: —_

**ORIGINAL:**

> Mercer. Ich las die Akte — ein Jahrzehnt an Einsätzen, manche so geheim, dass nicht einmal ich wusste, dass wir dort waren. Spezialeinheit wir aus dem Buch: schnell, effizient, keine losen Enden. Gut. Seine Fähigkeiten werde sicher brauchen. Seine Anforderungen waren unterschrieben, ehe ich mich setzte. „Recon One. Vier Leute, zwei Meldungen, neun Tage Funkstille. Gefangen genommen oder getötet. Gehen Sie vom schlimmsten aus, dann irren Sie sich höchstens in die richtige Richtung.“

**NEU:**

> Mercer. Ich las die Akte — ein Jahrzehnt an Einsätzen, manche so geheim, dass nicht einmal ich wusste, dass wir dort waren. Spezialeinheit wir aus dem Buch: schnell, effizient, keine losen Enden. Gut. Seine Fähigkeiten werde sicher brauchen. Seine Anforderungen waren unterschrieben, ehe ich mich setzte. „Recon One. Vier Leute, zwei Meldungen, neun Tage Funkstille. Gefangen genommen oder getötet. Gehen Sie vom schlimmsten aus, dann irren Sie sich höchstens in die richtige Richtung.“

##### Option `o_in_mercer_then` (auf Knoten `n_in_mercer`)

<!-- key: ev_intro::node::n_in_mercer::option::o_in_mercer_then::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_in_okafor_2`_

**ORIGINAL:**

> Jetzt die Wissenschaft. Okafor.

**NEU:**

#### Knoten `n_in_mercer_2`

<!-- key: ev_intro::node::n_in_mercer_2::text -->

- _Sprecher: —_

**ORIGINAL:**

> Mercer. Ich las die Akte — ein Jahrzehnt an Einsätzen, manche so geheim, dass nicht einmal ich wusste, dass wir dort waren. Spezialeinheit wir aus dem Buch: schnell, effizient, keine losen Enden. Gut. Seine Fähigkeiten werde sicher brauchen. Seine Anforderungen waren unterschrieben, ehe ich mich setzte. „Recon One. Vier Leute, zwei Meldungen, neun Tage Funkstille. Gefangen genommen oder getötet. Gehen Sie vom schlimmsten aus, dann irren Sie sich höchstens in die richtige Richtung.“

**NEU:**

##### Option `o_in_mercer2_go` (auf Knoten `n_in_mercer_2`)

<!-- key: ev_intro::node::n_in_mercer_2::option::o_in_mercer2_go::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_in_decide`_

**ORIGINAL:**

> Zur Wählebene.

**NEU:**

#### Knoten `n_in_okafor_2`

<!-- key: ev_intro::node::n_in_okafor_2::text -->

- _Sprecher: —_

**ORIGINAL:**

„Das Tor hält. Die Adresse hält, die Verbindung steht stabil. Was auch immer sie an ihren Meldungen gehindert hat, Direktor — es ist nicht die Physik, und genau das macht mir Angst“

**NEU:**
„Das Tor hält. Die Adresse hält, die Verbindung ist stabil. Was auch immer sie an ihren Meldungen gehindert hat, Direktor — es ist nicht die Physik, und genau das macht mir Angst“

##### Option `o_in_okafor2_go` (auf Knoten `n_in_okafor_2`)

<!-- key: ev_intro::node::n_in_okafor_2::option::o_in_okafor2_go::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_in_decide`_

**ORIGINAL:**

> Zur Wählebene.

**NEU:**

#### Knoten `n_in_decide`

<!-- key: ev_intro::node::n_in_decide::text -->

- _Sprecher: —_

**ORIGINAL:**

> Wir können binnen einer Stunde wählen. Was auch immer auf der anderen Seite ist, hat Recon One seit neun Tagen.

**NEU:**

> Wir können binnen einer Stunde wählen.

##### Option `o_in_commit` (auf Knoten `n_in_decide`)

<!-- key: ev_intro::node::n_in_decide::option::o_in_commit::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_in_go`_

**ORIGINAL:**

> Das Team zusammenstellen. Wir holen sie heim.

**NEU:**

##### Option `o_in_cautious` (auf Knoten `n_in_decide`)

<!-- key: ev_intro::node::n_in_decide::option::o_in_cautious::text -->

- _Bedingungen: keine_
- _Effekte: Flag intro_cautious=true_
- _→ Ende `out_in_go`_

**ORIGINAL:**

> Das Team zusammenstellen — aber beim ersten Zeichen von Ärger kommen sie zurück.

**NEU:**

#### Ergebnis `out_in_go` — Label

<!-- key: ev_intro::outcome::out_in_go::label -->

- _Effekte: schaltet m_vy_arrival frei_
- _Log (read-only): „Tag 1. Rettungssprung genehmigt. Adresse 04."_

**ORIGINAL:**

> Rettungssprung genehmigt

**NEU:**

---

## 2. Mission: Das stille Tal (`m_vy_arrival`)

- _Beschreibung (read-only): Adresse 04. Recon Ones letzte bekannte Position, seit neun Tagen still. Setzt über, findet die Spur, bringt alles zurück, das sagt, wohin sie gegangen sind._
- _Payload: narrative · Script `ev_vy_arrival`_

### Event: Das stille Tal (`ev_vy_arrival`) · Einstieg `n_va_gate`

#### Knoten `n_va_gate`

<!-- key: ev_vy_arrival::node::n_va_gate::text -->

- _Sprecher: —_

**ORIGINAL:**

> Das Tor öffnet sich, ein grünes Tal unter zwei Sonnen — Terrassenfelder, eine Straße aus festem weißem Stein, tief eingefahrene Karrenspuren. Recon Ones Markierungsbake liegt zehn Meter entfernt, oder das was davon übrig ist. Keine Leichen. Keine Patronenhülsen. Talaufwärts läutet eine Glocke einmal und verstummt, wie ein Versehen.

**NEU:**

##### Option `o_va_road` (auf Knoten `n_va_gate`)

<!-- key: ev_vy_arrival::node::n_va_gate::option::o_va_road::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_villagers`_

**ORIGINAL:**

> Der Straße talaufwärts folgen.

**NEU:**

#### Knoten `n_va_villagers`

<!-- key: ev_vy_arrival::node::n_va_villagers::text -->

- _Sprecher: —_

**ORIGINAL:**

> Sie kommen laufend aus den Feldreihen — ein Dutzend Dorfbewohner, so menschlich wie ihr, sonnengegerbt und hastig. Keiner von ihnen macht einen Laut. Sie ziehen an euren Armen und Rucksäcken, drängen euch von der Straße zur Baumgrenze, die Finger auf den Lippen. Der Älteste deutet die Straße hinab, dann drückt er die Hand flach zur Erde, die Botschaft ist klar: runter. Versteckt euch. Sofort.

**NEU:**

> Sie kommen laufend aus den Feldreihen — ein Dutzend Dorfbewohner, so menschlich wie ihr, sonnengegerbt und hastig. Keiner von ihnen macht einen Laut. Sie ziehen an euren Armen und Rucksäcken, drängen euch von der Straße zur Baumgrenze, die Finger auf den Lippen. Der Älteste deutet die Straße hinab, dann drückt er die Hand flach zur Erde, die Botschaft ist klar: runter. Versteckt euch. Sofort.

##### Option `o_va_trust` (auf Knoten `n_va_villagers`)

<!-- key: ev_vy_arrival::node::n_va_villagers::option::o_va_trust::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_procession`_

**ORIGINAL:**

> Ihnen vertrauen. Runter von der Straße.

**NEU:**

##### Option `o_va_refuse` (auf Knoten `n_va_villagers`)

<!-- key: ev_vy_arrival::node::n_va_villagers::option::o_va_refuse::text -->

- _Bedingungen: keine_
- _Effekte: Flag vy_villager_killed=true · trust_andara −3 · Erschöpfung +10 (squad)_
- _→ Knoten `n_va_fight`_

**ORIGINAL:**

> Losreißen. Vertrauen muss verdient werden.

**NEU:**

> Losreißen. Vertrauen muss verdient werden.

#### Knoten `n_va_procession`

<!-- key: ev_vy_arrival::node::n_va_procession::text -->

- _Sprecher: —_

**ORIGINAL:**

> Von der Baumgrenze spürt ihr es, ehe ihr es seht: ein Schritt, der euch durch den Boden erreicht, dann Sichtkontakt. Drohnen. Insektengestalten von der Größe von Güterwaggons, im Gänsemarsch, beladen mit Korn, Stoff, verschnürten Kisten — Tribut. Sie ziehen vorbei, ohne einen einzigen Blick auf die Welt um sie her, die weiße Straße hinab, zum Tor. Hindurch. Die Dorfbewohner sehen ihnen nicht nach. Sie sehen euch an und beschwören euch zum Schweigen.

**NEU:**

> Von der Baumgrenze spürt ihr es, ehe ihr es seht: ein Karren und weitere Töne, fremdartig und doch bekannt. Dann Sichtkontakt. Insekten wenigstens zweineinhalb Meter groß, bewaffnet, dazu einige Menschen die einen Karren schieben, verschnürten Kisten, Korn, Obst — Tribut? Sie ziehen vorbei, ohne einen einzigen Blick auf die Welt um sie her, die weiße Straße hinab, zum Tor. Hindurch. Die Dorfbewohner sehen ihnen nicht nach. Sie sehen euch an und beschwören euch zum Schweigen.

##### Option `o_va_stay_down` (auf Knoten `n_va_procession`)

<!-- key: ev_vy_arrival::node::n_va_procession::option::o_va_stay_down::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_escape`_

**ORIGINAL:**

> Unten bleiben, bis die letzte fort ist.

**NEU:**

#### Knoten `n_va_escape`

<!-- key: ev_vy_arrival::node::n_va_escape::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die letzte Träger-Drohne zieht vorbei, und die Dorfbewohner erheben sich, drängen euch am Graben entlang zum Mühlenpfad — eine stumme, halb rennende Reihe, nahezu lautlos. Dann stolpert ein Junge, kein Kind, aber sicherlich noch kein Mann, vielleicht 13 Jahre alt. Offensichtlich verletzt, vielleicht nur eine Zerrung vielleicht ein gebrochenes Bein. Ein kaum hörbares wimmern und ein knacken von trockenen Ästen. Mercer sieht sofort, zwei der Drohnen blieben stehen, die Köpfe zucken hin und her. Sie haben etwas gehört und werden jeden Moment umdrehen. Mercer ist bereits auf dem Weg zu dem Jungen.
> **NEU:**
> Die letzte Träger-Drohne zieht vorbei, und die Dorfbewohner erheben sich, drängen euch am Graben entlang zum Mühlenpfad — eine stumme, halb rennende Reihe, nahezu lautlos. Dann stolpert ein Junge, kein Kind, aber sicherlich noch kein Mann, vielleicht 13 Jahre alt. Offensichtlich verletzt, vielleicht nur eine Zerrung vielleicht ein gebrochenes Bein. Ein kaum hörbares wimmern und ein knacken von trockenen Ästen. Mercer sieht sofort, zwei der Drohnen blieben stehen, die Köpfe zucken hin und her. Sie haben etwas gehört und werden jeden Moment umdrehen. Mercer ist bereits auf dem Weg zu dem Jungen.

##### Option `o_va_hide` (auf Knoten `n_va_escape`)

<!-- key: ev_vy_arrival::node::n_va_escape::option::o_va_hide::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_boy_hidden=true · trust_andara +2_
- _→ Knoten `n_va_hide`_

**ORIGINAL:**

> Ihn in Deckung bringen. Verstecken.

**NEU:**

##### Option `o_va_run` (auf Knoten `n_va_escape`)

<!-- key: ev_vy_arrival::node::n_va_escape::option::o_va_run::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_boy_run=true_
- _→ Knoten `n_va_run`_

**ORIGINAL:**

> Keine Zeit zu verstecken. Den Jungen packen und rennen.

**NEU:**

#### Knoten `n_va_hide`

<!-- key: ev_vy_arrival::node::n_va_hide::text -->

- _Sprecher: —_

**ORIGINAL:**

> Mercer zieht den Jungen hinter einen mannhohen Stein, zu schmal um sich hinzulegen er muss ihn halten, der Junge kann nicht alleine stehen. Ein trockenes Rasseln und schnarren, ganz nah. Er zieht den jungen langsam, lautlos um den Stein, während die Drohnen vorbeiziehen — stets den Stein zwischen seinem Rücken und dem Schwenk ihrer augenlosen Köpfe —, bis das Rasseln die weiße Straße hinab verklingt. In den Feldreihen atmet niemand. Dann ist der Vater des Jungen, presst seine Stirn an die seines Sohnes, sein Blick gegenüber Mercer spricht Bände.

**NEU:**

> Mercer zieht den Jungen hinter einen mannhohen Stein, zu schmal um sich hinzulegen, der Junge kann nicht alleine stehen. Mercer hält ihn,dann nähert sich ein trockenes Rasseln, ein Schnarren, ganz nah. Er zieht den jungen langsam, lautlos um den Stein herum, während die Drohnen vorbeiziehen — stets den Stein zwischen seinem Rücken und dem Schwenk ihrer augenlosen Köpfe —, bis das Rasseln die weiße Straße hinab verklingt. In den Feldreihen atmet niemand. Dann ist der Vater des Jungen, presst seine Stirn an die seines Sohnes, sein Blick gegenüber Mercer spricht Bände.

##### Option `o_va_hide_on` (auf Knoten `n_va_hide`)

<!-- key: ev_vy_arrival::node::n_va_hide::option::o_va_hide_on::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_told`_

**ORIGINAL:**

> Euch von den Dorfbewohnern in Sicherheit führen lassen.

**NEU:**

#### Knoten `n_va_told`

<!-- key: ev_vy_arrival::node::n_va_told::text -->

- _Sprecher: —_

**ORIGINAL:**

> An der Baumgrenze zeichnet der Älteste Glyphen in den Staub — langsam, Strich für Strich, damit Okafor jede einzelne abmalen kann. Eine Adresse. Er kreuzt die Handgelenke: die Gebundenen. Vier Finger: vier wie ihr, durch das Tor genommen, lebend beim Übertreten. Der Ort, wohin die Genommenen gebracht werden. Eine Frau spricht seinen Namen laut aus, das erste Wort, das den ganzen Tag über jemand von ihnen gewagt hat: Veyra.

**NEU:**

##### Option `o_va_home` (auf Knoten `n_va_told`)

<!-- key: ev_vy_arrival::node::n_va_told::option::o_va_home::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_va_hide`_

**ORIGINAL:**

> Mit der Adresse heimkehren.

**NEU:**

#### Knoten `n_va_run`

<!-- key: ev_vy_arrival::node::n_va_run::text -->

- _Sprecher: —_

**ORIGINAL:**

> Drei Schritte, und die Flankierer haben den Winkel. Mercer wirft den Jungen zu Boden, dreht sich um und legt die erste Drohne mit einer Salve auf den Rücken. Die zweite ist fast über ihm, als Okafor sie niederstreckt — zwei Schuss, keine vergeudete Bewegung, die Musterschülerin des Schießausbilders. Das Rasseln hört auf. Das ganze Tal hat die Schüsse gehört.

**NEU:**

> Mercer sprintet zu dem Jungen und stößt ihn zu Boden, dreht sich um und erschießt die erste Drohne. Die zweite ist fast über ihm, als Okafor sie niederstreckt — zwei Schuss, keine vergeudete Bewegung, die Musterschülerin des Schießausbilders. Das Rasseln verstummt. Aber das ganze Tal hat die Schüsse gehört.

##### Option `o_va_run_watch` (auf Knoten `n_va_run`)

<!-- key: ev_vy_arrival::node::n_va_run::option::o_va_run_watch::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_run_gate`_

**ORIGINAL:**

> Die Dorfbewohner decken.

**NEU:**

#### Knoten `n_va_run_gate`

<!-- key: ev_vy_arrival::node::n_va_run_gate::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Vater reißt den Jungen hoch und presst seine Stirn an die seines Sohnes — einmal, fest. Dann rennen die Dorfbewohner, nicht zu den Bäumen: zum Tor. Eine alte Frau dreht die Wählsteine durch eine Adresse, die Okafor aus Instinkt einprägt; der Ring öffnet sich, und die Feldfamilien strömen hindurch. Das Tor schließt sich. Stille. Sie flohen zu dem Ort, wohin die Genommenen gebracht werden — zur Tür ihres eigenen Gottes.

**NEU:**

##### Option `o_va_run_home` (auf Knoten `n_va_run_gate`)

<!-- key: ev_vy_arrival::node::n_va_run_gate::option::o_va_run_home::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_va_run`_

**ORIGINAL:**

> Die Adresse notieren. Heimkehren.

**NEU:**

#### Knoten `n_va_fight`

<!-- key: ev_vy_arrival::node::n_va_fight::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ihr reißt euch los, und ein Stab kracht gegen Mercers Gewehr — dann ist es eine Rauferei an der Baumgrenze, stumm und verzweifelt, die Dorfbewohner kämpfen wie Menschen, die es sich nicht leisten können, gehört zu werden. Es endet falsch. Ein junger Dorfbewohner liegt am Boden, das Genick an einer Wurzel verdreht, reglos. Da beginnt der Boden zu beben.

**NEU:**

##### Option `o_va_freeze` (auf Knoten `n_va_fight`)

<!-- key: ev_vy_arrival::node::n_va_fight::option::o_va_freeze::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_procession_fight`_

**ORIGINAL:**

> Erstarren.

**NEU:**

#### Knoten `n_va_procession_fight`

<!-- key: ev_vy_arrival::node::n_va_procession_fight::text -->

- _Sprecher: —_

**ORIGINAL:**

> Jede Hand hält inne — ihre und eure. Drohnen, Insektengestalten von der Größe von Güterwaggons, ziehen unter Tributlasten die weiße Straße hinab, und alles Lebende im Tal hält still wie Stein, bis sie vorbei sind — zum Tor und hindurch. Okafor prüft den gefallenen Dorfbewohner auf einen Puls und findet keinen. Findet stattdessen eine Lederschnur an seinem Hals, eingebrannt mit Tor-Glyphen: eine Adresse. Von der Art, die ein ganzes Tal trägt, damit für seine Toten dort gesprochen werden kann, wohin die Genommenen gebracht werden.

**NEU:**

##### Option `o_va_take_address` (auf Knoten `n_va_procession_fight`)

<!-- key: ev_vy_arrival::node::n_va_procession_fight::option::o_va_take_address::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_va_fight_exit`_

**ORIGINAL:**

> Die Schnur einstecken. Abziehen, ehe die anderen sich sammeln.

**NEU:**

#### Knoten `n_va_fight_exit`

<!-- key: ev_vy_arrival::node::n_va_fight_exit::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Dorfbewohner holen ihre Toten schweigend zurück, und das Schweigen ist ein Urteil. Was die Schnur auch bedeutet, wohin die Genommenen auch gehen — jemand in diesem Tal weiß es, und keiner hier wird es euch je verraten. Die Glyphen auf der Schnur eines toten Jungen sind die einzige Spur, mit der ihr geht.

**NEU:**

##### Option `o_va_home_cold` (auf Knoten `n_va_fight_exit`)

<!-- key: ev_vy_arrival::node::n_va_fight_exit::option::o_va_home_cold::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_va_fight`_

**ORIGINAL:**

> Heimkehren.

**NEU:**

#### Ergebnis `out_va_hide` — Label

<!-- key: ev_vy_arrival::outcome::out_va_hide::label -->

- _Effekte: schaltet m_vy_ledger frei · XP +10 (squad)_
- _Log (read-only): „Adresse 04: Wir versteckten uns mit den Dorfbewohnern, und sie gaben uns die Adresse, wohin die Genommenen gebracht werden — Veyra. Vier Außenweltler gingen lebend durch das Tor. Das Tal vertraut uns seine Toten an."_

**ORIGINAL:**

> Die Adresse, freiwillig gegeben

**NEU:**

##### Ergebnis `out_va_hide` — Debrief

<!-- key: ev_vy_arrival::outcome::out_va_hide::debrief -->

- _Optionaler Recap-Text des Ergebnisses_

**ORIGINAL:**

> Ihr gingt mit den Feldfamilien in Deckung und ließt den Zug der Drohnen ungesehen passieren. Zum Dank gaben sie euch, wofür Command gesprungen war: Veyra, die Adresse, wohin die Genommenen gebracht werden — und die Nachricht, dass vier Außenweltler lebend durch das Tor gingen.

**NEU:**

#### Ergebnis `out_va_run` — Label

<!-- key: ev_vy_arrival::outcome::out_va_run::label -->

- _Effekte: schaltet m_vy_ledger frei · XP +10 (squad)_
- _Log (read-only): „Adresse 04: zwei Drohnen tot und die Schüsse im ganzen Tal gehört. Die Feldfamilien flohen durch das Tor zu ihrem Gott — Okafor hat die Adresse, die sie wählten. Die Genommenen gingen denselben Weg."_

**ORIGINAL:**

> Die Adresse, vom Wählwerk abgelesen

**NEU:**

##### Ergebnis `out_va_run` — Debrief

<!-- key: ev_vy_arrival::outcome::out_va_run::debrief -->

- _Optionaler Recap-Text des Ergebnisses_

**ORIGINAL:**

> Die Deckung brach, und zwei Drohnen fielen — Beweis, dass es möglich ist. Die Feldfamilien rannten zur Tür ihres eigenen Gottes und wählten das Tor vor euren Augen; Okafor las die Adresse vom Wählwerk ab. Die Genommenen gingen denselben Weg, und jetzt können wir es auch.

**NEU:**

#### Ergebnis `out_va_fight` — Label

<!-- key: ev_vy_arrival::outcome::out_va_fight::label -->

- _Effekte: schaltet m_vy_ledger frei · XP +5 (squad)_
- _Log (read-only): „Adresse 04: Ein Dorfbewohner ist durch unsere Hand tot. Seine Schnur trägt Tor-Glyphen — die Adresse, wohin die Genommenen und Toten dieses Tals gebracht werden. Das Tal wird sich an uns erinnern."_

**ORIGINAL:**

> Eine mit Blut erkaufte Stille

**NEU:**

##### Ergebnis `out_va_fight` — Debrief

<!-- key: ev_vy_arrival::outcome::out_va_fight::debrief -->

- _Optionaler Recap-Text des Ergebnisses_

**ORIGINAL:**

> Ein Dorfbewohner ist durch eure Hand tot, und die Schnur, die er trug, hielt die Glyphen, die Command brauchte — die Adresse, zu der die Genommenen und Toten des Tals gewählt werden. Ihr habt eure Peilung nach Veyra. Das Tal wird nicht vergessen, wie ihr sie genommen habt.

**NEU:**

---

## 3. Mission: Das Verzeichnis der Genommenen (`m_vy_ledger`)

- _Beschreibung (read-only): Zurück ins Tal. Karsu führt das Verzeichnis der Genommenen — und weiß, ob vier Außenweltler hinter dem Tor noch am Leben sind._
- _Payload: narrative · Script `ev_vy_ledger`_

### Event: Das Verzeichnis der Genommenen (`ev_vy_ledger`) · Einstieg `n_vl_arrive`

#### Knoten `n_vl_arrive`

<!-- key: ev_vy_ledger::node::n_vl_arrive::text -->

- _Sprecher: —_

**ORIGINAL:**

> Karsu: ein Mühlendorf aus Stein und Moos, wo das Tal sich verengt, quer über der Tributstraße. Rauch aus den Schornsteinen. Augen an den Fensterläden. Sie wussten, dass ihr kommt, ehe ihr die Brücke überquertet.

**NEU:**

##### Option `o_vl_warm` (auf Knoten `n_vl_arrive`)

<!-- key: ev_vy_ledger::node::n_vl_arrive::option::o_vl_warm::text -->

- _Bedingungen: trust_andara >= 2_
- _Effekte: keine_
- _→ Knoten `n_vl_welcome`_

**ORIGINAL:**

> Zur Brücke gehen.

**NEU:**

##### Option `o_vl_wary` (auf Knoten `n_vl_arrive`)

<!-- key: ev_vy_ledger::node::n_vl_arrive::option::o_vl_wary::text -->

- _Bedingungen: trust_andara >= 0 · trust_andara < 2_
- _Effekte: keine_
- _→ Knoten `n_vl_wary`_

**ORIGINAL:**

> Zur Brücke gehen.

**NEU:**

##### Option `o_vl_closed` (auf Knoten `n_vl_arrive`)

<!-- key: ev_vy_ledger::node::n_vl_arrive::option::o_vl_closed::text -->

- _Bedingungen: trust_andara < 0_
- _Effekte: keine_
- _→ Knoten `n_vl_barred`_

**ORIGINAL:**

> Zur Brücke gehen.

**NEU:**

#### Knoten `n_vl_welcome`

<!-- key: ev_vy_ledger::node::n_vl_welcome::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Junge von der Straße erwartet euch an der Brücke, zerschunden und grinsend, und ganz Karsu hat die Geschichte inzwischen gehört: der Außenweltler, der ihn hinter einem Stein hielt und sich mit dem Gang der Drohnen selbst mitdrehte. Odel, die Müllerin, öffnet die Tür des Verzeichnishauses selbst. „Karsu zahlt, was es schuldet. Kommt herein.“

**NEU:**

##### Option `o_vl_enter` (auf Knoten `n_vl_welcome`)

<!-- key: ev_vy_ledger::node::n_vl_welcome::option::o_vl_enter::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_story`_

**ORIGINAL:**

> Hineingehen.

**NEU:**

#### Knoten `n_vl_story`

<!-- key: ev_vy_ledger::node::n_vl_story::text -->

- _Sprecher: —_

**ORIGINAL:**

> Am Mühlenfeuer sprechen sie vom Erleuchteten, wie Bauern vom Wetter sprechen: ohne Zweifel. Er hört jedes Gebet, das auf der Tributstraße gesprochen wird — Namen, bei Einbruch der Dämmerung genannt, sind bis zum Morgen erhört. Er wandelt, wo man ihn verehrt. Neun Generationen lang hat er das Tal vor Hungersnot bewahrt, und der Preis ist der Tribut, und manchmal ist der Preis Menschen. Sie lügen nicht. Das merkt ihr.

**NEU:**

##### Option `o_vl_ask_taken` (auf Knoten `n_vl_story`)

<!-- key: ev_vy_ledger::node::n_vl_story::option::o_vl_ask_taken::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_ledger`_

**ORIGINAL:**

> Nach den Genommenen fragen.

**NEU:**

#### Knoten `n_vl_ledger`

<!-- key: ev_vy_ledger::node::n_vl_ledger::text -->

- _Sprecher: —_

**ORIGINAL:**

> Das Verzeichnis ist ein Mühlenbuch, mehlbestäubt, älter als jede Hand im Raum: jede Seele, die der Gott genommen hat, aufgeschrieben, damit jemand sich erinnert. Vier Einträge in frischer Tinte tragen eine Außenweltler-Glyphe. Odel berührt jeden der Reihe nach — lebendig. Karsus Träger sprangen mit dem letzten Getreidezehnt und sahen sie: eingesperrt unter der Bußstätte, dem Gefängnis, das die heilige Stadt auf Veyra unterhält, der Welt hinter dem Tor.

**NEU:**

##### Option `o_vl_ask_road` (auf Knoten `n_vl_ledger`)

<!-- key: ev_vy_ledger::node::n_vl_ledger::option::o_vl_ask_road::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_first`_

**ORIGINAL:**

> Fragen, wie Korn — und Träger — nach Veyra springen.

**NEU:**

#### Knoten `n_vl_first`

<!-- key: ev_vy_ledger::node::n_vl_first::text -->

- _Sprecher: Odel_

**ORIGINAL:**

> Sie dämpft das Feuer, ehe sie antwortet, als könnte der Name hören. „Als die Begnadeten zuletzt zu einer Nahme herabkamen, führte die Erste Klinge sie selbst an. Seryn Vael. Er stand am Straßenschrein und trank seine Portion — Licht, das in einem Becher stand, und er trank es wie Wasser. Betet, dass die Tür nicht in seiner Hand liegt an dem Tag, an dem ihr springt.“

**NEU:**

##### Option `o_vl_ask_crossing` (auf Knoten `n_vl_first`)

<!-- key: ev_vy_ledger::node::n_vl_first::option::o_vl_ask_crossing::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_transport`_

**ORIGINAL:**

> Und der Sprung?

**NEU:**

#### Knoten `n_vl_transport`

<!-- key: ev_vy_ledger::node::n_vl_transport::text -->

- _Sprecher: Odel_

**ORIGINAL:**

> Der Getreidezehnt setzt zweimal je Jahreszeit über: Karren zum Taltor, Träger hindurch, geradewegs in die Tempelspeicher auf der anderen Seite. Träger brauchen Papiere, und Papiere lassen sich für die beschaffen, denen Karsu vertraut. Der Turm an der Passstraße singt jeden Zug hindurch — die Tür öffnet sich für Verkehr, den sie erwartet, hinein und wieder hinaus. Der nächste Zehnt bricht bald auf.

**NEU:**

##### Option `o_vl_porters` (auf Knoten `n_vl_transport`)

<!-- key: ev_vy_ledger::node::n_vl_transport::option::o_vl_porters::text -->

- _Bedingungen: keine_
- _Effekte: materials −5 · Flag f_vy_transport=true_
- _→ Ende `out_vl_transport`_

**ORIGINAL:**

> Den Weg der Träger nehmen. Karsu zum Dank eure übrige Feldmedizin lassen.

**NEU:**

##### Option `o_vl_own_terms` (auf Knoten `n_vl_transport`)

<!-- key: ev_vy_ledger::node::n_vl_transport::option::o_vl_own_terms::text -->

- _Bedingungen: keine_
- _Effekte: Erschöpfung +10 (squad)_
- _→ Ende `out_vl_pilgrims`_

**ORIGINAL:**

> Den Gefallen ablehnen — ihr setzt als Pilger über, zu euren eigenen Bedingungen.

**NEU:**

#### Knoten `n_vl_wary`

<!-- key: ev_vy_ledger::node::n_vl_wary::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ein Karren versperrt halb die Brücke. Der Junge, den Mercer rettete, ist nicht hier — seine Familie floh mit den übrigen durch das Tor, und Karsu hält ihre Häuser gefegt für eine Rückkehr, die niemand verspricht. Odel, die Müllerin, kommt allein heraus. „Ihr habt einen der Unsrigen gerettet und uns die Feldfamilien gekostet. Nach den Schüssen durchstreiften die Begnadeten einen Tag lang dieses Tal — die Leute der Ersten Klinge, auf der Jagd. Beides ist wahr. Sagt, was ihr wollt.“

**NEU:**

##### Option `o_vl_wary_ask` (auf Knoten `n_vl_wary`)

<!-- key: ev_vy_ledger::node::n_vl_wary::option::o_vl_wary_ask::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_wary_ledger`_

**ORIGINAL:**

> Nach den Genommenen fragen.

**NEU:**

#### Knoten `n_vl_wary_ledger`

<!-- key: ev_vy_ledger::node::n_vl_wary_ledger::text -->

- _Sprecher: Odel_

**ORIGINAL:**

> Sie bringt das Mühlenbuch an die Brücke, statt die Tür zu öffnen: jede genommene Seele, aufgeschrieben, damit jemand sich erinnert. Vier frische Einträge tragen eine Außenweltler-Glyphe — lebendig, sagen die Träger, eingesperrt unter der Bußstätte auf Veyra, hinter dem Tor. „Der Getreidezehnt springt bald, und der Passturm singt ihn durch die Tür. Papiere sind zu haben — für die, die für das Risiko zahlen, das sie mit sich tragen.“

**NEU:**

##### Option `o_vl_wary_porters` (auf Knoten `n_vl_wary_ledger`)

<!-- key: ev_vy_ledger::node::n_vl_wary_ledger::option::o_vl_wary_porters::text -->

- _Bedingungen: keine_
- _Effekte: materials −8 · Flag f_vy_transport=true_
- _→ Ende `out_vl_transport`_

**ORIGINAL:**

> Für Papiere und einen Platz im Zehntzug zahlen.

**NEU:**

##### Option `o_vl_wary_own` (auf Knoten `n_vl_wary_ledger`)

<!-- key: ev_vy_ledger::node::n_vl_wary_ledger::option::o_vl_wary_own::text -->

- _Bedingungen: keine_
- _Effekte: Erschöpfung +10 (squad)_
- _→ Ende `out_vl_pilgrims`_

**ORIGINAL:**

> Euer Material behalten. Als Pilger springen, zu euren eigenen Bedingungen.

**NEU:**

#### Knoten `n_vl_barred`

<!-- key: ev_vy_ledger::node::n_vl_barred::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ein Karren versperrt die Brücke. Dahinter steht ganz Karsu, stumm, wie das Tal für die Drohnen stumm wird. Sie wissen, was zwischen den Bäumen geschah. Odel, die Müllerin, tritt allein vor und spricht über die Barriere hinweg, denn ihr Gesetz verlangt, dass für die Genommenen gesprochen werde — selbst zu euch.

**NEU:**

##### Option `o_vl_listen` (auf Knoten `n_vl_barred`)

<!-- key: ev_vy_ledger::node::n_vl_barred::option::o_vl_listen::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vl_barred_ledger`_

**ORIGINAL:**

> Zuhören.

**NEU:**

#### Knoten `n_vl_barred_ledger`

<!-- key: ev_vy_ledger::node::n_vl_barred_ledger::text -->

- _Sprecher: Odel_

**ORIGINAL:**

> „Der Erleuchtete hält das Tal satt; der Preis ist Tribut, und manchmal Menschen — eingetragen im Verzeichnis, damit jemand sich erinnert. Eure Vier sind am Leben, eingesperrt unter der Bußstätte, auf Veyra, hinter dem Tor. Wenn der Passturm singt, springt der Zehnt. Ihr werdet nicht dabei sein. Und betet, dass die Erste Klinge nicht an der Tür steht, wenn ihr euren eigenen Weg hindurch findet.“ Die Fensterläden schließen sich.

**NEU:**

##### Option `o_vl_high_country` (auf Knoten `n_vl_barred_ledger`)

<!-- key: ev_vy_ledger::node::n_vl_barred_ledger::option::o_vl_high_country::text -->

- _Bedingungen: keine_
- _Effekte: Erschöpfung +15 (squad) · materials −5_
- _→ Ende `out_vl_pilgrims`_

**ORIGINAL:**

> Dann als Pilger springen — kalt, schwer, allein.

**NEU:**

#### Ergebnis `out_vl_transport` — Label

<!-- key: ev_vy_ledger::outcome::out_vl_transport::label -->

- _Effekte: schaltet m_vy_intercept frei · XP +10 (squad)_
- _Log (read-only): „Recon One ist am Leben unter der Bußstätte auf Veyra. Karsu bringt uns mit dem Getreidezehnt hindurch — zuerst die Passtürme, deren Ruf jeden Zug durch die Tür singt, und wieder hinaus."_

**ORIGINAL:**

> Der Weg der Träger

**NEU:**

#### Ergebnis `out_vl_pilgrims` — Label

<!-- key: ev_vy_ledger::outcome::out_vl_pilgrims::label -->

- _Effekte: schaltet m_vy_intercept frei · XP +10 (squad)_
- _Log (read-only): „Recon One ist am Leben unter der Bußstätte auf Veyra. Kein Platz im Zehntzug — wir springen als Pilger, und die Türme an der Passstraße kommen zuerst: Ihr Ruf ist es, der die Tür nach außen öffnet."_

**ORIGINAL:**

> Dann als Pilger

**NEU:**

---

## 4. Mission: Der Tributruf (`m_vy_intercept`)

- _Beschreibung (read-only): Signaltürme an der Passstraße singen jeden Tributzug durch die Tür auf Veyra — und singen die geleerten Züge wieder hinaus. Nehmt die Türme der Reihe nach ein, und Commands Hand liegt auf dem einzigen Ruf, der den Weg nach Hause öffnet._
- _Payload: tactical_
- _Sieg-Effekte: intel +5 · XP +15 (squad) · Erschöpfung +20 (squad) · Flag f_vy_call_intercepted=true · schaltet m_vy_1 frei_
- _Niederlage-Effekte: support −1 · reiht ev_vy_regroup ein (+1T)_
- _Sieg-Log (read-only): „Der Tributruf gehört uns. Die Tür auf Veyra öffnet sich für das, was die Türme verlangen — und jetzt verlangen die Türme, was Command will. Der Weg nach Hause existiert wieder: schmal, geliehen und unser."_
- _Debrief (read-only): „Die Türme antworteten der Reihe nach, und Commands Hand schloss sich über dem Tributruf. Die Tür auf Veyra öffnet sich für das, was die Türme verlangen — und jetzt verlangen die Türme, was Command will. Der Weg nach Hause existiert wieder: schmal, geliehen und unser."_

_Rein taktische Mission — kein Narrativtext._

---

## 5. Folge-Ereignis (`ev_vy_regroup`)

- _Eingereiht von: m_vy_intercept · Niederlage (+1T)_

### Event: Sammeln am Tor (`ev_vy_regroup`) · Einstieg `n_vr_regroup`

#### Knoten `n_vr_regroup`

<!-- key: ev_vy_regroup::node::n_vr_regroup::text -->

- _Sprecher: —_

**ORIGINAL:**

> Das Team kommt durch das Tor zurück, dem Zugriff der Drohnen zuvor, zerschunden und ohne Antworten. Die Türme singen noch an der Passstraße — der Tributruf geht weiter, mit euch oder ohne euch. Bis zum Morgen hat Mercer die Annäherung neu geplant.

**NEU:**

##### Option `o_vr_again` (auf Knoten `n_vr_regroup`)

<!-- key: ev_vy_regroup::node::n_vr_regroup::option::o_vr_again::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_vr_again`_

**ORIGINAL:**

> Erneut hinein.

**NEU:**

#### Ergebnis `out_vr_again` — Label

<!-- key: ev_vy_regroup::outcome::out_vr_again::label -->

- _Effekte: schaltet m_vy_intercept frei_
- _Log (read-only): „Die Passtürme sind noch in Tempelhand. Wir gehen erneut hinein."_

**ORIGINAL:**

> Die Türme singen noch

**NEU:**

---

## 6. Mission: Pilgerwege (`m_vy_1`)

- _Beschreibung (read-only): Die Tür auf Veyra öffnet nur in eine Richtung. Springt zum Sitz des Gottes und findet einen Weg in die Bußstätte, bevor Recon Ones Spur erkaltet._
- _Payload: narrative · Script `ev_vy_pilgrim_roads`_

### Event: Pilgerstraßen (`ev_vy_pilgrim_roads`) · Einstieg `n_vy1_arrive`

#### Knoten `n_vy1_arrive`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_arrive::text -->

- _Sprecher: —_

**ORIGINAL:**

> Veyra. Die Tür steht offen in ihrem Wachhaus auf der Pilgerterrasse, und sie öffnet nur in eine Richtung: Die Wachen wählen niemanden hinaus ohne das Wort des Tempels. Über der Terrasse steigt die heilige Stadt empor, weißer Stein und Glockentürme, bis zum ringförmigen Bezirk der Bußstätte — wo vier Namen in frischer Tinte warten. Der Sprung hinein ist frei. Es ist die Tür nach Hause, die verschlossen ist.

**NEU:**

##### Option `o_vy1_arrive_porters` (auf Knoten `n_vy1_arrive`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_arrive::option::o_vy1_arrive_porters::text -->

- _Bedingungen: Flag f_vy_transport == true_
- _Effekte: keine_
- _→ Knoten `n_vy1_faces`_

**ORIGINAL:**

> Mit Karsus Zehntzug springen — Trägerpapiere, Korn auf den Schultern, erwarteter Verkehr.

**NEU:**

##### Option `o_vy1_arrive_foot` (auf Knoten `n_vy1_arrive`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_arrive::option::o_vy1_arrive_foot::text -->

- _Bedingungen: Flag f_vy_transport == false_
- _Effekte: keine_
- _→ Knoten `n_vy1_faces`_

**ORIGINAL:**

> Als Pilger springen — zwei weitere staubige Reisende unter den vielen, die die Tür empfängt.

**NEU:**

#### Knoten `n_vy1_faces`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_faces::text -->

- _Sprecher: —_

**ORIGINAL:**

> Gesichter auf der Terrasse.

**NEU:**

##### Option `o_vy1_faces_hidden` (auf Knoten `n_vy1_faces`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_faces::option::o_vy1_faces_hidden::text -->

- _Bedingungen: Flag f_vy_boy_hidden == true_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Unter den Pilgern: der Junge von der Straße und sein Vater, mit dem Zehnt des Tals heraufgekommen. Der Vater sucht Mercers Blick und faltet beide Hände flach — der Dank des Tals, gegeben, wo der Gott es sehen kann. Auch die Dorfbewohner nutzen das Netz. Das taten sie immer schon.

**NEU:**

##### Option `o_vy1_faces_run` (auf Knoten `n_vy1_faces`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_faces::option::o_vy1_faces_run::text -->

- _Bedingungen: Flag f_vy_boy_run == true_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Am Wachhaus, in Büßergrau: der Junge von der Straße und sein Vater — die geflohenen Feldfamilien, gekommen, um für die toten Drohnen um Vergebung zu bitten. Der Vater presst seine Stirn an die seines Sohnes, dann sieht er euch an: Furcht und Schuld im selben Gesicht. Auch die Dorfbewohner nutzen das Netz.

**NEU:**

##### Option `o_vy1_faces_killed` (auf Knoten `n_vy1_faces`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_faces::option::o_vy1_faces_killed::text -->

- _Bedingungen: Flag vy_villager_killed == true_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Am Wachhaus, in Büßergrau: ein Gesicht von der Baumgrenze — der Vater des toten Jungen, gekommen, um den Namen seines Sohnes dort zu sprechen, wohin die Genommenen und die Toten gebracht werden. Er sieht euch an, und durch euch hindurch, und wendet sich ab. Er weiß genau, wer ihr seid. Auch die Dorfbewohner nutzen das Netz.

**NEU:**

#### Knoten `n_vy1_gather`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_gather::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ein Tag Zeit zum Arbeiten, ehe der Plan ein Plan sein muss. Genug Zeit, um etwas zu erfahren, wenn ihr acht gebt, wer zuhört.

**NEU:**

##### Option `o_vy1_pilgrims` (auf Knoten `n_vy1_gather`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_gather::option::o_vy1_pilgrims::text -->

- _Bedingungen: nicht(Flag f_vy_intel_pilgrims == true) · Trupp-diplomacy ≥ 4_
- _Effekte: Flag f_vy_intel_pilgrims=true_
- _→ Knoten `n_vy1_pilgrims_detail`_

**ORIGINAL:**

> Unter den Pilgern lauschen.

**NEU:**

##### Option `o_vy1_patrols` (auf Knoten `n_vy1_gather`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_gather::option::o_vy1_patrols::text -->

- _Bedingungen: nicht(Flag f_vy_intel_patrols == true) · Trupp-combat ≥ 5_
- _Effekte: Flag f_vy_intel_patrols=true_
- _→ Knoten `n_vy1_patrols_detail`_

**ORIGINAL:**

> Den Tempelpatrouillen folgen.

**NEU:**

##### Option `o_vy1_relay` (auf Knoten `n_vy1_gather`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_gather::option::o_vy1_relay::text -->

- _Bedingungen: nicht(Flag f_vy_intel_comms == true) · Trupp-science ≥ 6_
- _Effekte: Flag f_vy_intel_comms=true · doubt +1_
- _→ Knoten `n_vy1_relay_detail`_

**ORIGINAL:**

> Okafor: den Funkverkehr des Tempels anzapfen.

**NEU:**

##### Option `o_vy1_move_on` (auf Knoten `n_vy1_gather`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_gather::option::o_vy1_move_on::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy1_plan`_

**ORIGINAL:**

> Wir wissen genug. Zum Plan übergehen.

**NEU:**

#### Knoten `n_vy1_pilgrims_detail`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_pilgrims_detail::text -->

- _Sprecher: —_

**ORIGINAL:**

> Worte treiben zwischen den Prozessionen: „Oru wandelt, wo man ihn verehrt.“ Lehre, kein Beweis — aber der erste Riss darin, wie sie ihn erklären.

**NEU:**

##### Option `o_vy1_pilgrims_continue` (auf Knoten `n_vy1_pilgrims_detail`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_pilgrims_detail::option::o_vy1_pilgrims_continue::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy1_patrols_detail`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_patrols_detail::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Wachablösungen sind lockerer, als sie wirken — vorhersehbar, wenn man lange genug zusieht.

**NEU:**

##### Option `o_vy1_patrols_continue` (auf Knoten `n_vy1_patrols_detail`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_patrols_detail::option::o_vy1_patrols_continue::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy1_relay_detail`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_relay_detail::text -->

- _Sprecher: Dr. A. Okafor_

**ORIGINAL:**

> Okafor zapft den Funkverkehr an und schweigt einen langen Moment. „Das ist verschlüsselt“, sagt sie schließlich. „Götter brauchen keine Verschlüsselung.“

**NEU:**

##### Option `o_vy1_relay_continue` (auf Knoten `n_vy1_relay_detail`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_relay_detail::option::o_vy1_relay_continue::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy1_gather`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy1_plan`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_plan::text -->

- _Sprecher: —_

**ORIGINAL:**

> Drei Wege hinein, und keiner davon leicht.

**NEU:**

##### Option `o_vy1_uniform_choice` (auf Knoten `n_vy1_plan`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_plan::option::o_vy1_uniform_choice::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_approach_uniform=true_
- _→ Knoten `n_vy1_uniform`_

**ORIGINAL:**

> Wachuniformen — als Tempelpersonal hineinspazieren.

**NEU:**

##### Option `o_vy1_worker_choice` (auf Knoten `n_vy1_plan`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_plan::option::o_vy1_worker_choice::text -->

- _Bedingungen: nicht(Flag f_vy_dessik_refused == true)_
- _Effekte: Flag f_vy_approach_worker=true_
- _→ Knoten `n_vy1_dessik`_

**ORIGINAL:**

> Versorgungsarbeiter — mit den Getreidekarren hinein.

**NEU:**

##### Option `o_vy1_assault_choice` (auf Knoten `n_vy1_plan`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_plan::option::o_vy1_assault_choice::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_approach_assault=true_
- _→ Ende `out_vy1_assault`_

**ORIGINAL:**

> Offener Angriff — laut hinein.

**NEU:**

#### Knoten `n_vy1_uniform`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Kasernenhof leert sich vor dem Schichtwechsel.

**NEU:**

##### Option `o_vy1_knockout` (auf Knoten `n_vy1_uniform`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform::option::o_vy1_knockout::text -->

- _Bedingungen: Trupp-combat ≥ 5_
- _Effekte: Flag f_vy_uniform_knockout=true_
- _→ Knoten `n_vy1_uniform_body`_

**ORIGINAL:**

> Eine einzelne Wache niederschlagen und ihre Uniform nehmen.

**NEU:**

##### Option `o_vy1_bathhouse` (auf Knoten `n_vy1_uniform`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform::option::o_vy1_bathhouse::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_uniform_stolen=true_
- _→ Ende `out_vy1_uniform`_

**ORIGINAL:**

> Einen anderen Weg finden: während der Vigilstunde ein Uniform-Set aus dem Badehaus entwenden.

**NEU:**

#### Knoten `n_vy1_uniform_body`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform_body::text -->

- _Sprecher: —_

**ORIGINAL:**

> Er ist bewusstlos und bleibt es eine Weile. Was nun?

**NEU:**

##### Option `o_vy1_hide_body` (auf Knoten `n_vy1_uniform_body`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform_body::option::o_vy1_hide_body::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_body_hidden=true_
- _→ Ende `out_vy1_uniform`_

**ORIGINAL:**

> Ihn in der Zisterne verstecken.

**NEU:**

##### Option `o_vy1_leave_body` (auf Knoten `n_vy1_uniform_body`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_uniform_body::option::o_vy1_leave_body::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_vy1_uniform`_

**ORIGINAL:**

> Ihn liegen lassen. Schnell weiter.

**NEU:**

#### Knoten `n_vy1_dessik`

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_dessik::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Makler Dessik besorgt euch Arbeitspässe — für einen Preis. Sein Sohn Ilo ist als Schmuggler verurteilt, irgendwo in der Bußstätte festgehalten. „Holt ihn heraus“, sagt Dessik, „und die Karren gehören euch.“

**NEU:**

##### Option `o_vy1_dessik_accept` (auf Knoten `n_vy1_dessik`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_dessik::option::o_vy1_dessik_accept::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_owe_ilo=true_
- _→ Ende `out_vy1_worker`_

**ORIGINAL:**

> Es schwören.

**NEU:**

##### Option `o_vy1_dessik_refuse` (auf Knoten `n_vy1_dessik`)

<!-- key: ev_vy_pilgrim_roads::node::n_vy1_dessik::option::o_vy1_dessik_refuse::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_dessik_refused=true_
- _→ Knoten `n_vy1_plan`_

**ORIGINAL:**

> Ablehnen. Einen anderen Weg hinein finden.

**NEU:**

#### Ergebnis `out_vy1_uniform` — Label

<!-- key: ev_vy_pilgrim_roads::outcome::out_vy1_uniform::label -->

- _Effekte: schaltet m_vy_2 frei_

**ORIGINAL:**

> Infiltration vorbereitet — Wachuniform

**NEU:**

#### Ergebnis `out_vy1_worker` — Label

<!-- key: ev_vy_pilgrim_roads::outcome::out_vy1_worker::label -->

- _Effekte: schaltet m_vy_2 frei_

**ORIGINAL:**

> Infiltration vorbereitet — Versorgungskarren

**NEU:**

#### Ergebnis `out_vy1_assault` — Label

<!-- key: ev_vy_pilgrim_roads::outcome::out_vy1_assault::label -->

- _Effekte: schaltet m_vy_2 frei_

**ORIGINAL:**

> Plan: offener Angriff

**NEU:**

---

## 7. Mission: Die Bußstätte (`m_vy_2`)

- _Beschreibung (read-only): Der Plan steht. Dringt in das Basilika-Gefängnis ein und findet Recon One._
- _Payload: narrative · Script `ev_vy_penitence`_

### Event: Die Bußstätte (`ev_vy_penitence`) · Einstieg `n_vy2_router`

#### Knoten `n_vy2_router`

<!-- key: ev_vy_penitence::node::n_vy2_router::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Plan trägt euch zum Tempeltor. Was auch als Nächstes geschieht, es geschieht schnell.

**NEU:**

##### Option `o_vy2_route_uniform` (auf Knoten `n_vy2_router`)

<!-- key: ev_vy_penitence::node::n_vy2_router::option::o_vy2_route_uniform::text -->

- _Bedingungen: Flag f_vy_approach_uniform == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_gate`_

**ORIGINAL:**

> In Wachuniform annähern.

**NEU:**

##### Option `o_vy2_route_worker` (auf Knoten `n_vy2_router`)

<!-- key: ev_vy_penitence::node::n_vy2_router::option::o_vy2_route_worker::text -->

- _Bedingungen: Flag f_vy_approach_worker == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_b_kitchens`_

**ORIGINAL:**

> Mit den Getreidekarren annähern.

**NEU:**

##### Option `o_vy2_route_assault` (auf Knoten `n_vy2_router`)

<!-- key: ev_vy_penitence::node::n_vy2_router::option::o_vy2_route_assault::text -->

- _Bedingungen: Flag f_vy_approach_assault == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_c_assault_1`_

**ORIGINAL:**

> Das Tor frontal angreifen.

**NEU:**

#### Knoten `n_vy2_a_gate`

<!-- key: ev_vy_penitence::node::n_vy2_a_gate::text -->

- _Sprecher: —_

**ORIGINAL:**

> Wachuniform, Tempeltor, morgendlicher Schichtwechsel.

**NEU:**

##### Option `o_vy2_a_case_complication` (auf Knoten `n_vy2_a_gate`)

<!-- key: ev_vy_penitence::node::n_vy2_a_gate::option::o_vy2_a_case_complication::text -->

- _Bedingungen: Flag f_vy_uniform_knockout == true · nicht(Flag f_vy_body_hidden == true)_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_complication`_

**ORIGINAL:**

> Zum Kontrollposten vorrücken.

**NEU:**

##### Option `o_vy2_a_case_smooth` (auf Knoten `n_vy2_a_gate`)

<!-- key: ev_vy_penitence::node::n_vy2_a_gate::option::o_vy2_a_case_smooth::text -->

- _Bedingungen: Flag f_vy_uniform_knockout == true · Flag f_vy_body_hidden == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Zum Kontrollposten vorrücken.

**NEU:**

##### Option `o_vy2_a_case_seal` (auf Knoten `n_vy2_a_gate`)

<!-- key: ev_vy_penitence::node::n_vy2_a_gate::option::o_vy2_a_case_seal::text -->

- _Bedingungen: Flag f_vy_uniform_stolen == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_seal`_

**ORIGINAL:**

> Zum Kontrollposten vorrücken.

**NEU:**

#### Knoten `n_vy2_a_complication`

<!-- key: ev_vy_penitence::node::n_vy2_a_complication::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ein Feldwebel kneift die Augen zu eurem Gesicht zusammen. Er schwört, die Uhr der vermissten Wache an eurem Handgelenk gesehen zu haben.

**NEU:**

##### Option `o_vy2_a_talk` (auf Knoten `n_vy2_a_complication`)

<!-- key: ev_vy_penitence::node::n_vy2_a_complication::option::o_vy2_a_talk::text -->

- _Bedingungen: Trupp-diplomacy ≥ 5_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Ihn beschwichtigen.

**NEU:**

##### Option `o_vy2_a_overpower` (auf Knoten `n_vy2_a_complication`)

<!-- key: ev_vy_penitence::node::n_vy2_a_complication::option::o_vy2_a_overpower::text -->

- _Bedingungen: Trupp-combat ≥ 6_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Den Kontrollposten lautlos ausschalten.

**NEU:**

##### Option `o_vy2_a_push` (auf Knoten `n_vy2_a_complication`)

<!-- key: ev_vy_penitence::node::n_vy2_a_complication::option::o_vy2_a_push::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_alarm=true_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Vorbeidrängen, ehe er es durchdenkt.

**NEU:**

#### Knoten `n_vy2_a_seal`

<!-- key: ev_vy_penitence::node::n_vy2_a_seal::text -->

- _Sprecher: —_

**ORIGINAL:**

> Das innere Tor verlangt ein Rangsiegel, das eure geliehene Uniform nicht hat.

**NEU:**

##### Option `o_vy2_a_bluff_easy` (auf Knoten `n_vy2_a_seal`)

<!-- key: ev_vy_penitence::node::n_vy2_a_seal::option::o_vy2_a_bluff_easy::text -->

- _Bedingungen: Flag f_vy_intel_pilgrims == true · Trupp-diplomacy ≥ 4_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Als neu Versetzte bluffen.

**NEU:**

##### Option `o_vy2_a_bluff_hard` (auf Knoten `n_vy2_a_seal`)

<!-- key: ev_vy_penitence::node::n_vy2_a_seal::option::o_vy2_a_bluff_hard::text -->

- _Bedingungen: Flag f_vy_intel_pilgrims == false · Trupp-diplomacy ≥ 5_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Als neu Versetzte bluffen.

**NEU:**

##### Option `o_vy2_a_ossuary` (auf Knoten `n_vy2_a_seal`)

<!-- key: ev_vy_penitence::node::n_vy2_a_seal::option::o_vy2_a_ossuary::text -->

- _Bedingungen: Flag f_vy_intel_patrols == true_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Stattdessen durch den Beinhaus-Gang schlüpfen.

**NEU:**

##### Option `o_vy2_a_push2` (auf Knoten `n_vy2_a_seal`)

<!-- key: ev_vy_penitence::node::n_vy2_a_seal::option::o_vy2_a_push2::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_alarm=true_
- _→ Knoten `n_vy2_a_cells`_

**ORIGINAL:**

> Vorbeidrängen, ehe sie es durchdenken.

**NEU:**

#### Knoten `n_vy2_a_cells`

<!-- key: ev_vy_penitence::node::n_vy2_a_cells::text -->

- _Sprecher: —_

**ORIGINAL:**

> Zellentrakt. Reihen von Türen — und hinter einer, vier hager gewordene Gesichter. Barros ist am Gitter, ehe das Licht ihn findet: Mercers alter Feldwebel, zwei Einsätze zwischen ihnen. „Captain Mercer. Feldwebel Barros.“ Dann, aus dem Dunkel, fest wie ein Appell: „Leutnant Ehlan. Kade. Imura. Alle anwesend, Sir.“ Namen und Ränge vor Sätzen — Tage aus nichts als Disziplin, und sie hält.

**NEU:**

##### Option `o_vy2_a_open` (auf Knoten `n_vy2_a_cells`)

<!-- key: ev_vy_penitence::node::n_vy2_a_cells::option::o_vy2_a_open::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy2_a_report`_

**ORIGINAL:**

> Die Türen öffnen.

**NEU:**

#### Knoten `n_vy2_a_report`

<!-- key: ev_vy_penitence::node::n_vy2_a_report::text -->

- _Sprecher: Lt. S. Ehlan_

**ORIGINAL:**

> Ehlan meldet, als wäre die Gefangenschaft ein Posten gewesen: auf der Talstraße genommen, durch das Tor getrieben, verhört von Männern, die Licht tranken. „Wir haben die Sprünge gezählt, Captain. Die Tür unten öffnet hinein, nie hinaus — niemand geht fort außer auf das Wort der Wachen. Wie ihr auch hereinkamt, es ist kein Weg nach Hause.“ Wie hinaus?

**NEU:**

##### Option `o_vy2_a_quiet` (auf Knoten `n_vy2_a_report`)

<!-- key: ev_vy_penitence::node::n_vy2_a_report::option::o_vy2_a_quiet::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy2_bottleneck_ab`_

**ORIGINAL:**

> Leiser Weg hinaus. Langsam, aber leise.

**NEU:**

##### Option `o_vy2_a_bell` (auf Knoten `n_vy2_a_report`)

<!-- key: ev_vy_penitence::node::n_vy2_a_report::option::o_vy2_a_bell::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_alarm=true_
- _→ Knoten `n_vy2_bottleneck_ab`_

**ORIGINAL:**

> Ablenkung am Glockenturm. Schnell, aber laut.

**NEU:**

#### Knoten `n_vy2_b_kitchens`

<!-- key: ev_vy_penitence::node::n_vy2_b_kitchens::text -->

- _Sprecher: —_

**ORIGINAL:**

> Getreidekarren, Essensrunden — das Gefängnis läuft nach Ritual, vorhersehbar wie ein Uhrwerk. Hinter einer Zellentür vier hagere Gesichter. Barros umklammert das Gitter: „Captain. Feldwebel Barros — Ehlan, Kade, Imura, alle anwesend, Sir.“ Ehlan meldet schon: Die Tür unten öffnet hinein, nie hinaus; niemand geht fort außer auf das Wort der Wachen. Und drei Türen weiter: Ilo, Dessiks Sohn.

**NEU:**

##### Option `o_vy2_b_free_ilo` (auf Knoten `n_vy2_b_kitchens`)

<!-- key: ev_vy_penitence::node::n_vy2_b_kitchens::option::o_vy2_b_free_ilo::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_ilo_freed=true · reiht ev_vy_dessik_word ein (+5T)_
- _→ Knoten `n_vy2_b_exfil`_

**ORIGINAL:**

> Auch Ilo befreien. Ein Versprechen ist ein Versprechen.

**NEU:**

##### Option `o_vy2_b_leave_ilo` (auf Knoten `n_vy2_b_kitchens`)

<!-- key: ev_vy_penitence::node::n_vy2_b_kitchens::option::o_vy2_b_leave_ilo::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_ilo_abandoned=true · Flag f_vy_alarm=true · Verletzung inj_shaken_
- _→ Knoten `n_vy2_bottleneck_ab`_

**ORIGINAL:**

> Ihn zurücklassen. Recon One geht vor.

**NEU:**

#### Knoten `n_vy2_b_exfil`

<!-- key: ev_vy_penitence::node::n_vy2_b_exfil::text -->

- _Sprecher: —_

**ORIGINAL:**

> Zwei zusätzliche Personen lautlos zu bewegen, und die Wachablösung im Gang wartet nicht.

**NEU:**

##### Option `o_vy2_b_resolve` (auf Knoten `n_vy2_b_exfil`)

<!-- key: ev_vy_penitence::node::n_vy2_b_exfil::option::o_vy2_b_resolve::text -->

- _Bedingungen: Trupp-resolve ≥ 5_
- _Effekte: keine_
- _→ Knoten `n_vy2_bottleneck_ab`_

**ORIGINAL:**

> Die Nerven halten, das Tempo halten.

**NEU:**

##### Option `o_vy2_b_alarm` (auf Knoten `n_vy2_b_exfil`)

<!-- key: ev_vy_penitence::node::n_vy2_b_exfil::option::o_vy2_b_alarm::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_alarm=true_
- _→ Knoten `n_vy2_bottleneck_ab`_

**ORIGINAL:**

> Es erzwingen und den Lärm in Kauf nehmen.

**NEU:**

#### Knoten `n_vy2_c_assault_1`

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_1::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Wandgeschütze zielen, ehe ihr in Reichweite seid. Vorläufer-Technik, sagt jemand — das Licht sieht nach keiner Waffe aus, gegen die ihr geübt habt.

**NEU:**

##### Option `o_vy2_c_1` (auf Knoten `n_vy2_c_assault_1`)

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_1::option::o_vy2_c_1::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy2_c_assault_2`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy2_c_assault_2`

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_2::text -->

- _Sprecher: —_

**ORIGINAL:**

> Handfeuerwaffen prallen an einem Schild ab, dessen Rand ihr nicht seht. Das würde nie ein fairer Kampf werden.

**NEU:**

##### Option `o_vy2_c_2` (auf Knoten `n_vy2_c_assault_2`)

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_2::option::o_vy2_c_2::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy2_c_assault_3`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy2_c_assault_3`

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_3::text -->

- _Sprecher: —_

**ORIGINAL:**

> Kein Weg hindurch. Nur eine Wahl, wie das hier endet.

**NEU:**

##### Option `o_vy2_c_press` (auf Knoten `n_vy2_c_assault_3`)

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_3::option::o_vy2_c_press::text -->

- _Bedingungen: keine_
- _Effekte: Verletzung inj_wounded · Flag f_vy_captured=true_
- _→ Knoten `n_vy2_bottleneck_c`_

**ORIGINAL:**

> In die Bresche drängen.

**NEU:**

##### Option `o_vy2_c_fallback` (auf Knoten `n_vy2_c_assault_3`)

<!-- key: ev_vy_penitence::node::n_vy2_c_assault_3::option::o_vy2_c_fallback::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_captured=true_
- _→ Knoten `n_vy2_bottleneck_c`_

**ORIGINAL:**

> Zum Tor zurückweichen.

**NEU:**

#### Knoten `n_vy2_bottleneck_ab`

<!-- key: ev_vy_penitence::node::n_vy2_bottleneck_ab::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Erste Klinge weiß bereits, dass ihr hier seid.

**NEU:**

##### Option `o_vy2_bn_alarm` (auf Knoten `n_vy2_bottleneck_ab`)

<!-- key: ev_vy_penitence::node::n_vy2_bottleneck_ab::option::o_vy2_bn_alarm::text -->

- _Bedingungen: Flag f_vy_alarm == true_
- _Effekte: keine_
- _→ Ende `out_vy2_next`_

**ORIGINAL:**

> Glocken über euch — sie waren schnell, um euch zuvorzukommen.

**NEU:**

##### Option `o_vy2_bn_quiet` (auf Knoten `n_vy2_bottleneck_ab`)

<!-- key: ev_vy_penitence::node::n_vy2_bottleneck_ab::option::o_vy2_bn_quiet::text -->

- _Bedingungen: Flag f_vy_alarm == false_
- _Effekte: keine_
- _→ Ende `out_vy2_next`_

**ORIGINAL:**

> Keine Glocken. Nur eine Stille, die bedeutet, dass sie es schon wussten.

**NEU:**

#### Knoten `n_vy2_bottleneck_c`

<!-- key: ev_vy_penitence::node::n_vy2_bottleneck_c::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ausrüstung beschlagnahmt, Zellen neben genau den Leuten, für die ihr gekommen seid — die Rettung, umgekehrt. Im Dunkeln zuerst die Namen: Ehlan. Kade. Imura. Und Barros, der durch eine aufgeplatzte Lippe seinen alten Captain angrinst: „Hat ja gedauert, Sir.“ Bei Tagesanbruch öffnen sich die Zellentüren von selbst. Der Hof wartet.

**NEU:**

##### Option `o_vy2_c_move` (auf Knoten `n_vy2_bottleneck_c`)

<!-- key: ev_vy_penitence::node::n_vy2_bottleneck_c::option::o_vy2_c_move::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Ende `out_vy2_next`_

**ORIGINAL:**

> Los.

**NEU:**

#### Ergebnis `out_vy2_next` — Label

<!-- key: ev_vy_penitence::outcome::out_vy2_next::label -->

- _Effekte: schaltet m_vy_3 frei_

**ORIGINAL:**

> Die Erste Klinge rückt heran

**NEU:**

---

## 8. Folge-Ereignis (`ev_vy_dessik_word`)

- _Eingereiht von: ev_vy_penitence · o_vy2_b_free_ilo (+5T)_

### Event: Dessiks Wort (`ev_vy_dessik_word`) · Einstieg `n_vy_dessik`

#### Knoten `n_vy_dessik`

<!-- key: ev_vy_dessik_word::node::n_vy_dessik::text -->

- _Sprecher: Makler Dessik_

**ORIGINAL:**

> Die Nachricht kommt über drei Mittelsmänner und einen bestochenen Wähler: Dessik und sein Sohn Ilo, lebendig und frei. „Ein Schmuggler zahlt seine Schulden, oder man vertraut ihm nicht mehr“, lautet die Botschaft. „Meine Routen sind jetzt eure Routen. Hier ist das Erste davon.“ Beigefügt ist ein dickes Bündel abgefangener Botschaften, das kein Tempel je zu teilen gedachte.

**NEU:**

##### Option `o_vy_dessik_take` (auf Knoten `n_vy_dessik`)

<!-- key: ev_vy_dessik_word::node::n_vy_dessik::option::o_vy_dessik_take::text -->

- _Bedingungen: keine_
- _Effekte: intel +10_
- _→ Ende `out_vy_dessik`_
- _Log (read-only): „Dessiks Netz zahlt ein gehaltenes Versprechen zurück: Aufklärung +10."_

**ORIGINAL:**

> Nehmen, was er sendet.

**NEU:**

#### Ergebnis `out_vy_dessik` — Label

<!-- key: ev_vy_dessik_word::outcome::out_vy_dessik::label -->

- _Effekte: keine_

**ORIGINAL:**

> Eine beglichene Schuld

**NEU:**

---

## 9. Mission: Die Erste Klinge (`m_vy_3`)

- _Beschreibung (read-only): Seryn Vael, der Streiter des Erleuchteten, steht zwischen euch und dem Weg hinaus._
- _Payload: narrative · Script `ev_vy_first_blade`_

### Event: Die Erste Klinge (`ev_vy_first_blade`) · Einstieg `n_vy3_intro`

#### Knoten `n_vy3_intro`

<!-- key: ev_vy_first_blade::node::n_vy3_intro::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die andere Seite des Tors. Welcher Plan euch auch so weit trug, hier endet er.

**NEU:**

##### Option `o_vy3_intro_ab` (auf Knoten `n_vy3_intro`)

<!-- key: ev_vy_first_blade::node::n_vy3_intro::option::o_vy3_intro_ab::text -->

- _Bedingungen: Flag f_vy_captured == false_
- _Effekte: keine_
- _→ Knoten `n_vy3_confront`_

**ORIGINAL:**

> Seryn Vael und seine Ehrengarde stellen euch mitten in der Flucht im Prozessionshof.

**NEU:**

##### Option `o_vy3_intro_c` (auf Knoten `n_vy3_intro`)

<!-- key: ev_vy_first_blade::node::n_vy3_intro::option::o_vy3_intro_c::text -->

- _Bedingungen: Flag f_vy_captured == true_
- _Effekte: keine_
- _→ Knoten `n_vy3_confront`_

**ORIGINAL:**

> Richthof, Morgengrauen. Seryn verliest das Urteil: „Ihr alle brennt bei Einbruch der Dämmerung. Oru ist gnädig — die Dämmerung ist Stunden entfernt.“

**NEU:**

#### Knoten `n_vy3_confront`

<!-- key: ev_vy_first_blade::node::n_vy3_confront::text -->

- _Sprecher: Seryn Vael_

**ORIGINAL:**

> Seryn tritt auf gleiche Höhe, die Klinge noch in der Scheide, und das Licht ist unter seiner Haut — schwach, in den Adern seines Halses und seiner Hände. Die Gnade der Portion, offen getragen, wie ein anderer seinen Rang trägt. „Sagt, wozu ihr gekommen seid — oder auch nicht.“

**NEU:**

##### Option `o_vy3_convince_b1_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b1_win::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_pilgrims == false · Trupp-diplomacy ≥ 7_
- _Effekte: Flag f_vy_first_convinced=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Ihn überzeugen — ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b1_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b1_fail::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_pilgrims == false · nicht(Trupp-diplomacy ≥ 7)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Ihn überzeugen — ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b2_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b2_win::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_pilgrims == true · Trupp-diplomacy ≥ 6_
- _Effekte: Flag f_vy_first_convinced=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Ihn überzeugen — ihm seine eigene Schrift vorhalten: Ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b2_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b2_fail::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_pilgrims == true · nicht(Trupp-diplomacy ≥ 6)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Ihn überzeugen — ihm seine eigene Schrift vorhalten: Ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b3_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b3_win::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_pilgrims == false · Trupp-diplomacy ≥ 6_
- _Effekte: Flag f_vy_first_convinced=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Ihn überzeugen — ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b3_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b3_fail::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_pilgrims == false · nicht(Trupp-diplomacy ≥ 6)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Ihn überzeugen — ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b4_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b4_win::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_pilgrims == true · Trupp-diplomacy ≥ 5_
- _Effekte: Flag f_vy_first_convinced=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Ihn überzeugen — ihm seine eigene Schrift vorhalten: Ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_convince_b4_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_convince_b4_fail::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_pilgrims == true · nicht(Trupp-diplomacy ≥ 5)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Ihn überzeugen — ihm seine eigene Schrift vorhalten: Ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.

**NEU:**

##### Option `o_vy3_explain_b1_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b1_win::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_comms == false · Trupp-science ≥ 7_
- _Effekte: Flag f_vy_first_doubt=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott. Nur Energiesignaturen und Projektionsartefakte.

**NEU:**

##### Option `o_vy3_explain_b1_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b1_fail::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_comms == false · nicht(Trupp-science ≥ 7)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott. Nur Energiesignaturen und Projektionsartefakte.

**NEU:**

##### Option `o_vy3_explain_b2_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b2_win::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_comms == true · Trupp-science ≥ 5_
- _Effekte: Flag f_vy_first_doubt=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott, und Okafor hat die Aufzeichnungen als Beweis.

**NEU:**

##### Option `o_vy3_explain_b2_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b2_fail::text -->

- _Bedingungen: doubt < 1 · Flag f_vy_intel_comms == true · nicht(Trupp-science ≥ 5)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott, und Okafor hat die Aufzeichnungen als Beweis.

**NEU:**

##### Option `o_vy3_explain_b3_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b3_win::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_comms == false · Trupp-science ≥ 6_
- _Effekte: Flag f_vy_first_doubt=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott. Nur Energiesignaturen und Projektionsartefakte.

**NEU:**

##### Option `o_vy3_explain_b3_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b3_fail::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_comms == false · nicht(Trupp-science ≥ 6)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott. Nur Energiesignaturen und Projektionsartefakte.

**NEU:**

##### Option `o_vy3_explain_b4_win` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b4_win::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_comms == true · Trupp-science ≥ 4_
- _Effekte: Flag f_vy_first_doubt=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott, und Okafor hat die Aufzeichnungen als Beweis.

**NEU:**

##### Option `o_vy3_explain_b4_fail` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_explain_b4_fail::text -->

- _Bedingungen: doubt >= 1 · Flag f_vy_intel_comms == true · nicht(Trupp-science ≥ 4)_
- _Effekte: keine_
- _→ Knoten `n_vy3_hardens`_

**ORIGINAL:**

> Erklären — es gibt keinen Gott, und Okafor hat die Aufzeichnungen als Beweis.

**NEU:**

##### Option `o_vy3_fight` (auf Knoten `n_vy3_confront`)

<!-- key: ev_vy_first_blade::node::n_vy3_confront::option::o_vy3_fight::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy3_duel`_

**ORIGINAL:**

> Ihn bekämpfen.

**NEU:**

#### Knoten `n_vy3_hardens`

<!-- key: ev_vy_first_blade::node::n_vy3_hardens::text -->

- _Sprecher: Seryn Vael_

**ORIGINAL:**

> Etwas in seinem Gesicht verschließt sich. „Ihr hattet eure Gelegenheit zu sprechen“, sagt er, und die Ehrengarde fächert sich hinter ihm auf.

**NEU:**

##### Option `o_vy3_hardens_continue` (auf Knoten `n_vy3_hardens`)

<!-- key: ev_vy_first_blade::node::n_vy3_hardens::option::o_vy3_hardens_continue::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy3_duel`_

**ORIGINAL:**

> Ziehen.

**NEU:**

#### Knoten `n_vy3_duel`

<!-- key: ev_vy_first_blade::node::n_vy3_duel::text -->

- _Sprecher: —_

**ORIGINAL:**

> Drei Gänge, Klinge gegen Klinge, und er ist schneller als alles, gegen das ihr geübt habt — ein Begnadeter, die Portion in ihm lodernd. Doch er ist ein Mann gegen ein Team, mit dem befreiten Recon One im Rücken, und Zahlen ermüden nicht.

**NEU:**

##### Option `o_vy3_duel_clean` (auf Knoten `n_vy3_duel`)

<!-- key: ev_vy_first_blade::node::n_vy3_duel::option::o_vy3_duel_clean::text -->

- _Bedingungen: Trupp-combat ≥ 7_
- _Effekte: Flag f_vy_first_defeated=true_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Den Vorteil nutzen.

**NEU:**

##### Option `o_vy3_duel_costly` (auf Knoten `n_vy3_duel`)

<!-- key: ev_vy_first_blade::node::n_vy3_duel::option::o_vy3_duel_costly::text -->

- _Bedingungen: nicht(Trupp-combat ≥ 7)_
- _Effekte: Flag f_vy_first_defeated=true · Verletzung inj_wounded_
- _→ Knoten `n_vy3_resolve_intro`_

**ORIGINAL:**

> Den Vorteil nutzen.

**NEU:**

#### Knoten `n_vy3_resolve_intro`

<!-- key: ev_vy_first_blade::node::n_vy3_resolve_intro::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Tore hinter euch, Recon One befreit, die Stadt redet schon über das, was sie sah.

**NEU:**

##### Option `o_vy3_ri_vestry` (auf Knoten `n_vy3_resolve_intro`)

<!-- key: ev_vy_first_blade::node::n_vy3_resolve_intro::option::o_vy3_ri_vestry::text -->

- _Bedingungen: Flag f_vy_captured == true_
- _Effekte: keine_
- _→ Knoten `n_vy3_resolve`_

**ORIGINAL:**

> Im Hinausgehen mitnehmen, was in der Sakristei übrig ist.

**NEU:**

##### Option `o_vy3_ri_plain` (auf Knoten `n_vy3_resolve_intro`)

<!-- key: ev_vy_first_blade::node::n_vy3_resolve_intro::option::o_vy3_ri_plain::text -->

- _Bedingungen: Flag f_vy_captured == false_
- _Effekte: keine_
- _→ Knoten `n_vy3_resolve`_

**ORIGINAL:**

> Weiter.

**NEU:**

#### Knoten `n_vy3_resolve`

<!-- key: ev_vy_first_blade::node::n_vy3_resolve::text -->

- _Sprecher: —_

**ORIGINAL:**

> So oder so endet die Geschichte der Ersten Klinge hier — vorerst.

**NEU:**

##### Option `o_vy3_resolve_convinced` (auf Knoten `n_vy3_resolve`)

<!-- key: ev_vy_first_blade::node::n_vy3_resolve::option::o_vy3_resolve_convinced::text -->

- _Bedingungen: Flag f_vy_first_convinced == true_
- _Effekte: Held h_seryn dazu · Flag f_vy_seryn_recruited=true · Flag f_vy_expedition_freed=true · Personal −NaN_
- _→ Ende `out_vy3_convinced`_

**ORIGINAL:**

> Seryn befiehlt der Ehrengarde zurückzutreten, streift seinen Patronengurt voller Portions-Phiolen ab und reicht ihn hinüber. „Untersucht es. Ich habe genug getrunken.“ Er geht mit euch hinaus.

**NEU:**

##### Option `o_vy3_resolve_doubt` (auf Knoten `n_vy3_resolve`)

<!-- key: ev_vy_first_blade::node::n_vy3_resolve::option::o_vy3_resolve_doubt::text -->

- _Bedingungen: Flag f_vy_first_doubt == true_
- _Effekte: Held h_seryn dazu · Flag f_vy_seryn_recruited=true · Flag f_vy_expedition_freed=true · Personal −NaN_
- _→ Ende `out_vy3_doubt`_

**ORIGINAL:**

> Seryn lässt euch passieren — und folgt, um den Beweis mit eigenen Augen zu sehen. Seine letzten Phiolen gibt er Okafor: „Dann sagt mir, was ich getrunken habe.“

**NEU:**

##### Option `o_vy3_resolve_defeated` (auf Knoten `n_vy3_resolve`)

<!-- key: ev_vy_first_blade::node::n_vy3_resolve::option::o_vy3_resolve_defeated::text -->

- _Bedingungen: Flag f_vy_first_defeated == true_
- _Effekte: Flag f_vy_expedition_freed=true · Personal −NaN_
- _→ Ende `out_vy3_defeated`_

**ORIGINAL:**

> Ihr tragt die Erste Klinge auf einem Getreidekarren hinaus. Er dankt euch nicht. In seiner Ausrüstung: Phiolen stehenden Lichts — die Portion, die ihn zu mehr als einem Mann machte.

**NEU:**

#### Ergebnis `out_vy3_convinced` — Label

<!-- key: ev_vy_first_blade::outcome::out_vy3_convinced::label -->

- _Effekte: Flag f_vy_sacrament_dose=true · schaltet m_vy_4 frei_
- _Log (read-only): „Recon One kommt heim — alle vier, längst überfällig, hinaus durch die Tür unter einem Tributruf, den der Tempel glaubt."_

**ORIGINAL:**

> Die Erste Klinge läuft über

**NEU:**

#### Ergebnis `out_vy3_doubt` — Label

<!-- key: ev_vy_first_blade::outcome::out_vy3_doubt::label -->

- _Effekte: Flag f_vy_sacrament_dose=true · schaltet m_vy_4 frei_
- _Log (read-only): „Recon One kommt heim — alle vier, längst überfällig, hinaus durch die Tür unter einem Tributruf, den der Tempel glaubt."_

**ORIGINAL:**

> Die Erste Klinge, zweifelnd

**NEU:**

#### Ergebnis `out_vy3_defeated` — Label

<!-- key: ev_vy_first_blade::outcome::out_vy3_defeated::label -->

- _Effekte: Flag f_vy_sacrament_dose=true · schaltet m_vy_4 frei_
- _Log (read-only): „Recon One kommt heim — alle vier, längst überfällig, hinaus durch die Tür unter einem Tributruf, den der Tempel glaubt."_

**ORIGINAL:**

> Die Erste Klinge, besiegt

**NEU:**

---

## 10. Mission: Das Reliquiengewölbe (`m_vy_4`)

- _Beschreibung (read-only): Erbeutet die Vorläufer-Artefakte aus der Tempelrüstkammer: rüstet die Forschung aus und findet das Sanktum des Gottes._
- _Payload: narrative · Script `ev_vy_relic_vault`_

### Event: Reliquiengewölbe (`ev_vy_relic_vault`) · Einstieg `n_vy4_approach`

#### Knoten `n_vy4_approach`

<!-- key: ev_vy_relic_vault::node::n_vy4_approach::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Tempelrüstkammer liegt hinter dem Heiligtum begraben — zwei Bannsäulen versiegeln die Gewölbetür, und dahinter warten Vorläufer-Reliquien. Irgendwo jenseits davon ist die Maschine, die einen Menschen zum Gott macht. Wachen säumen jeden Säulengang.

**NEU:**

##### Option `o_vy4_alerted` (auf Knoten `n_vy4_approach`)

<!-- key: ev_vy_relic_vault::node::n_vy4_approach::option::o_vy4_alerted::text -->

- _Bedingungen: Flag f_vy_ilo_abandoned == true_
- _Effekte: Erschöpfung +10 (squad)_
- _→ Knoten `n_vy4_wards`_

**ORIGINAL:**

> Die Säulengänge sind doppelt besetzt — Dessik hat euch verraten, kaum dass ihr ihn verließt. Laut, schnell hinein.

**NEU:**

##### Option `o_vy4_quiet` (auf Knoten `n_vy4_approach`)

<!-- key: ev_vy_relic_vault::node::n_vy4_approach::option::o_vy4_quiet::text -->

- _Bedingungen: Flag f_vy_ilo_abandoned == false_
- _Effekte: keine_
- _→ Knoten `n_vy4_wards`_

**ORIGINAL:**

> Recon Ones Bericht kartierte die Nachtrunden — die Schicht ist dünn besetzt. Auf die Bannsäulen zu.

**NEU:**

#### Knoten `n_vy4_wards`

<!-- key: ev_vy_relic_vault::node::n_vy4_wards::text -->

- _Sprecher: —_

**ORIGINAL:**

> Zwei Bannsäulen flankieren die Gewölbetür, jede summend vom selben weißen Licht, vor dem die Pilger knien. Beide müssen erlöschen, ehe die Tür sich öffnet.

**NEU:**

##### Option `o_vy4_seryn` (auf Knoten `n_vy4_wards`)

<!-- key: ev_vy_relic_vault::node::n_vy4_wards::option::o_vy4_seryn::text -->

- _Bedingungen: Flag f_vy_seryn_recruited == true_
- _Effekte: keine_
- _→ Knoten `n_vy4_core`_

**ORIGINAL:**

> Seryn kennt die Riten — er stillt eine Säule mit einem Wort und einer Geste, wenn auch seine Hände zwischen den Worten zu zittern begonnen haben. Das Team übernimmt die andere.

**NEU:**

##### Option `o_vy4_science` (auf Knoten `n_vy4_wards`)

<!-- key: ev_vy_relic_vault::node::n_vy4_wards::option::o_vy4_science::text -->

- _Bedingungen: eine von(Trupp-Archetyp: scientist · Trupp-science ≥ 6)_
- _Effekte: keine_
- _→ Knoten `n_vy4_core`_

**ORIGINAL:**

> Okafor liest die Resonanz und fährt beide Säulen sauber herunter.

**NEU:**

##### Option `o_vy4_force` (auf Knoten `n_vy4_wards`)

<!-- key: ev_vy_relic_vault::node::n_vy4_wards::option::o_vy4_force::text -->

- _Bedingungen: Trupp-combat ≥ 5_
- _Effekte: Erschöpfung +5 (squad)_
- _→ Knoten `n_vy4_core`_

**ORIGINAL:**

> Die Leitungen der Säulen zerschlagen — grob, aber sie erlöschen.

**NEU:**

##### Option `o_vy4_slow` (auf Knoten `n_vy4_wards`)

<!-- key: ev_vy_relic_vault::node::n_vy4_wards::option::o_vy4_slow::text -->

- _Bedingungen: keine_
- _Effekte: Erschöpfung +15 (squad)_
- _→ Knoten `n_vy4_core`_

**ORIGINAL:**

> Keine Abkürzung. Sie von Hand bearbeiten, eine nach der anderen, und hoffen, dass die Wachen träge bleiben.

**NEU:**

#### Knoten `n_vy4_core`

<!-- key: ev_vy_relic_vault::node::n_vy4_core::text -->

- _Sprecher: —_

**ORIGINAL:**

> Die Gewölbetür knirscht auf. Drinnen, gebettet in ein Nest von Projektorgehäusen, sitzt der Kern — eine Energiezelle, dicht genug, um eine Kathedrale aus Licht zu speisen. An den Wänden Tributkisten mit Tor-Glyphen gestempelt: ausgehend. Den Kern herauszubekommen verlangt eine ruhige Hand, während die Wachen vom Saal her heranrücken.

**NEU:**

##### Option `o_vy4_extract` (auf Knoten `n_vy4_core`)

<!-- key: ev_vy_relic_vault::node::n_vy4_core::option::o_vy4_extract::text -->

- _Bedingungen: eine von(Trupp-Archetyp: scientist · Trupp-science ≥ 6)_
- _Effekte: keine_
- _→ Knoten `n_vy4_exfil`_

**ORIGINAL:**

> Okafor löst ihn unversehrt aus dem Gehäuse.

**NEU:**

##### Option `o_vy4_yank` (auf Knoten `n_vy4_core`)

<!-- key: ev_vy_relic_vault::node::n_vy4_core::option::o_vy4_yank::text -->

- _Bedingungen: keine_
- _Effekte: Verletzung inj_shaken_
- _→ Knoten `n_vy4_exfil`_

**ORIGINAL:**

> Keine Zeit für Feinheiten. Herausreißen und rennen.

**NEU:**

#### Knoten `n_vy4_exfil`

<!-- key: ev_vy_relic_vault::node::n_vy4_exfil::text -->

- _Sprecher: —_

**ORIGINAL:**

> Den Kern in der Hand, ist der Weg hinaus das Einzige, was noch zwischen euch und dem Tor steht.

**NEU:**

##### Option `o_vy4_exfil_alarm` (auf Knoten `n_vy4_exfil`)

<!-- key: ev_vy_relic_vault::node::n_vy4_exfil::option::o_vy4_exfil_alarm::text -->

- _Bedingungen: Flag f_vy_alarm == true_
- _Effekte: Erschöpfung +5 (squad)_
- _→ Ende `out_vy4_secured`_

**ORIGINAL:**

> Die Glocken läuten schon — zum Tor durchkämpfen.

**NEU:**

##### Option `o_vy4_exfil_quiet` (auf Knoten `n_vy4_exfil`)

<!-- key: ev_vy_relic_vault::node::n_vy4_exfil::option::o_vy4_exfil_quiet::text -->

- _Bedingungen: Flag f_vy_alarm == false_
- _Effekte: keine_
- _→ Ende `out_vy4_secured`_

**ORIGINAL:**

> Hinausschleichen, wie ihr gekommen seid.

**NEU:**

#### Ergebnis `out_vy4_secured` — Label

<!-- key: ev_vy_relic_vault::outcome::out_vy4_secured::label -->

- _Effekte: Flag f_vy_godtech=true · exotics +3 · schaltet m_vy_5 frei_
- _Log (read-only): „Der Gewölbekern ist an Bord. Er summt wie etwas Betendes."_

**ORIGINAL:**

> Gewölbe gesichert — der Gott hat einen Körper

**NEU:**

---

## 11. Mission: Der Erleuchtete (`m_vy_5`)

- _Beschreibung (read-only): Der Kern des Gewölbes schwingt im Gleichklang mit einem Sanktum in der Caldera. Verfolgt es und tretet dem Gott von Angesicht zu Angesicht gegenüber._
- _Payload: narrative · Script `ev_vy_luminous_one`_

### Event: Der Erleuchtete (`ev_vy_luminous_one`) · Einstieg `n_vy5_witness`

#### Knoten `n_vy5_witness`

<!-- key: ev_vy_luminous_one::node::n_vy5_witness::text -->

- _Sprecher: —_

**ORIGINAL:**

> Der Kern führte euch hierher: ein Sanktum in der toten Caldera, und der Erleuchtete steht darin. Eine hohe Gestalt aus Licht — und um sie her, halb im Fels versunken, die Maschinerie, die keine Schrift benennt. Emitter. Gehäuse. Die Erbauer der Weltentore sind längst fort; dies blieb zurück, um ihr Werk zu hüten, und niemand sagte ihm, wann es aufhören solle. Es hat die Lampe sehr lange brennen lassen, und es hat sie allein am Brennen gehalten.

**NEU:**

##### Option `o_vy5_seryn_present` (auf Knoten `n_vy5_witness`)

<!-- key: ev_vy_luminous_one::node::n_vy5_witness::option::o_vy5_seryn_present::text -->

- _Bedingungen: eine von(Flag f_vy_seryn_recruited == true · Flag f_vy_first_defeated == true)_
- _Effekte: keine_
- _→ Knoten `n_vy5_seryn_watch`_

**ORIGINAL:**

> Neben euch kann Seryn den Blick nicht abwenden.

**NEU:**

##### Option `o_vy5_no_seryn` (auf Knoten `n_vy5_witness`)

<!-- key: ev_vy_luminous_one::node::n_vy5_witness::option::o_vy5_no_seryn::text -->

- _Bedingungen: Flag f_vy_seryn_recruited == false · Flag f_vy_first_defeated == false_
- _Effekte: keine_
- _→ Knoten `n_vy5_decide`_

**ORIGINAL:**

> Näher herantreten.

**NEU:**

#### Knoten `n_vy5_seryn_watch`

<!-- key: ev_vy_luminous_one::node::n_vy5_seryn_watch::text -->

- _Sprecher: Seryn Vael_

**ORIGINAL:**

> Seryn betrachtet das Licht, dem er sein ganzes Leben gab, und die müden Maschinen, die es erzeugen. Er tobt nicht. Er weint nicht. „Es hat uns nie belogen“, sagt er schließlich, sehr leise. „Es hat nur… die Lampe am Brennen gehalten. Damit es nicht allein im Dunkeln wäre.“ Die Erste Klinge des Erleuchteten senkt zum letzten Mal den Blick von ihrem Gott.

**NEU:**

##### Option `o_vy5_seryn_continue` (auf Knoten `n_vy5_seryn_watch`)

<!-- key: ev_vy_luminous_one::node::n_vy5_seryn_watch::option::o_vy5_seryn_continue::text -->

- _Bedingungen: keine_
- _Effekte: keine_
- _→ Knoten `n_vy5_decide`_

**ORIGINAL:**

> Nichts sagen. Näher herantreten.

**NEU:**

#### Knoten `n_vy5_decide`

<!-- key: ev_vy_luminous_one::node::n_vy5_decide::text -->

- _Sprecher: —_

**ORIGINAL:**

> Es hat euch noch nicht gesehen. Was immer es ist — ein Hüter, ein Relikt, ein Geist, der seine Schöpfer überlebte — es ist in Reichweite. Und ebenso alles, was das Sanktum euch erzählen könnte.

**NEU:**

##### Option `o_vy5_watch` (auf Knoten `n_vy5_decide`)

<!-- key: ev_vy_luminous_one::node::n_vy5_decide::option::o_vy5_watch::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_watched_god=true · intel +20_
- _→ Knoten `n_vy5_watch_seryn`_

**ORIGINAL:**

> Beobachten. Alles aufzeichnen. Es enden lassen und gehen.

**NEU:**

##### Option `o_vy5_attack` (auf Knoten `n_vy5_decide`)

<!-- key: ev_vy_luminous_one::node::n_vy5_decide::option::o_vy5_attack::text -->

- _Bedingungen: keine_
- _Effekte: Flag f_vy_fought_god=true · Flag f_vy_anchor_destroyed=true · support +2 · Verletzung inj_shaken · reiht ev_vy_gratitude ein (+3T)_
- _→ Knoten `n_vy5_attack_seryn`_

**ORIGINAL:**

> Es beenden. Den Gott jetzt zu Fall bringen.

**NEU:**

#### Knoten `n_vy5_watch_seryn`

<!-- key: ev_vy_luminous_one::node::n_vy5_watch_seryn::text -->

- _Sprecher: —_

**ORIGINAL:**

> Das Wesen vollendet seinen Ritus — ein langsames Zurückfalten des Lichts in die Emitter — und ist einfach fort, wie eine Projektion fort ist. Es wusste nie, dass ihr da wart. Aber ihr wart es, und die Sensoren waren es, und jetzt habt ihr alles: wie eine Maschine, die ein totes Tor hüten sollte, sich zu einem Gott machte, damit die lange Wache niemals allein wäre.

**NEU:**

##### Option `o_vy5_watch_defeated` (auf Knoten `n_vy5_watch_seryn`)

<!-- key: ev_vy_luminous_one::node::n_vy5_watch_seryn::option::o_vy5_watch_defeated::text -->

- _Bedingungen: Flag f_vy_first_defeated == true_
- _Effekte: reiht ev_vy_seryn_oath ein (+2T)_
- _→ Ende `out_vy5_watch_defeated`_

**ORIGINAL:**

> Auf dem Grat hinter euch bittet die gefangene Erste Klinge ums Wort.

**NEU:**

##### Option `o_vy5_watch_doubt` (auf Knoten `n_vy5_watch_seryn`)

<!-- key: ev_vy_luminous_one::node::n_vy5_watch_seryn::option::o_vy5_watch_doubt::text -->

- _Bedingungen: Flag f_vy_first_defeated == false · Flag f_vy_first_doubt == true_
- _Effekte: keine_
- _→ Ende `out_vy5_watch_doubt`_

**ORIGINAL:**

> Seryn sieht das letzte Licht erlöschen und lässt es geschehen.

**NEU:**

##### Option `o_vy5_watch_other` (auf Knoten `n_vy5_watch_seryn`)

<!-- key: ev_vy_luminous_one::node::n_vy5_watch_seryn::option::o_vy5_watch_other::text -->

- _Bedingungen: Flag f_vy_first_defeated == false · Flag f_vy_first_doubt == false_
- _Effekte: keine_
- _→ Ende `out_vy5_watch_other`_

**ORIGINAL:**

> Die Sensoren einpacken. Was es auch war, es ist nun fort.

**NEU:**

#### Knoten `n_vy5_attack_seryn`

<!-- key: ev_vy_luminous_one::node::n_vy5_attack_seryn::text -->

- _Sprecher: —_

**ORIGINAL:**

> Ihr eröffnet das Feuer. Es wirft eine Wand aus Licht auf, an der Handfeuerwaffen abprallen, dann erhebt es sich, faltet sich und entweicht durch ein Tor zwischen einem Atemzug und dem nächsten. Es würde ohnehin entkommen — es ist Schlimmerem als euch entronnen. Doch der Anker des Sanktums birst im Rückstoß, die Emitter erlöschen flackernd, und die Caldera wird still und leer, zum ersten Mal seit einem Zeitalter.

**NEU:**

##### Option `o_vy5_attack_defeated` (auf Knoten `n_vy5_attack_seryn`)

<!-- key: ev_vy_luminous_one::node::n_vy5_attack_seryn::option::o_vy5_attack_defeated::text -->

- _Bedingungen: Flag f_vy_first_defeated == true_
- _Effekte: keine_
- _→ Ende `out_vy5_fought_seryn_lost`_

**ORIGINAL:**

> Im Chaos reißt sich die gefangene Erste Klinge los.

**NEU:**

##### Option `o_vy5_attack_other` (auf Knoten `n_vy5_attack_seryn`)

<!-- key: ev_vy_luminous_one::node::n_vy5_attack_seryn::option::o_vy5_attack_other::text -->

- _Bedingungen: Flag f_vy_first_defeated == false_
- _Effekte: keine_
- _→ Ende `out_vy5_fought`_

**ORIGINAL:**

> Hinaus in eine Stille treten, die keine Glocke je wieder füllen wird.

**NEU:**

#### Ergebnis `out_vy5_watch_defeated` — Label

<!-- key: ev_vy_luminous_one::outcome::out_vy5_watch_defeated::label -->

- _Effekte: keine_
- _Log (read-only): „Der Erleuchtete ist aufgezeichnet, ganz und erklärbar. Seryn Vael will reden."_

**ORIGINAL:**

> Bezeugt — die Erste Klinge wird folgen

**NEU:**

#### Ergebnis `out_vy5_watch_doubt` — Label

<!-- key: ev_vy_luminous_one::outcome::out_vy5_watch_doubt::label -->

- _Effekte: keine_
- _Log (read-only): „Der Erleuchtete ist aufgezeichnet. Seryn sah den Beweis und wandte den Blick nicht ab."_

**ORIGINAL:**

> Bezeugt — der Bekehrte bleibt

**NEU:**

#### Ergebnis `out_vy5_watch_other` — Label

<!-- key: ev_vy_luminous_one::outcome::out_vy5_watch_other::label -->

- _Effekte: keine_
- _Log (read-only): „Der Erleuchtete ist aufgezeichnet, ganz und erklärbar."_

**ORIGINAL:**

> Bezeugt — alles aufgezeichnet

**NEU:**

#### Ergebnis `out_vy5_fought_seryn_lost` — Label

<!-- key: ev_vy_luminous_one::outcome::out_vy5_fought_seryn_lost::label -->

- _Effekte: keine_
- _Log (read-only): „Veyra ist seinen Gott los. Seryn Vael warf sich in das Licht, um es zu schützen, und ist fort — er schuldete ihm einen Tod, wenn schon nichts anderes."_

**ORIGINAL:**

> Der Anker zerschmettert — die Erste Klinge verloren

**NEU:**

#### Ergebnis `out_vy5_fought` — Label

<!-- key: ev_vy_luminous_one::outcome::out_vy5_fought::label -->

- _Effekte: keine_
- _Log (read-only): „Veyra ist seinen Gott los. Die Caldera ist dunkel."_

**ORIGINAL:**

> Der Anker zerschmettert

**NEU:**

---

## 12. Folge-Ereignis (`ev_vy_seryn_oath`)

- _Eingereiht von: ev_vy_luminous_one · o_vy5_watch_defeated (+2T)_

### Event: Der Eid der Ersten Klinge (`ev_vy_seryn_oath`) · Einstieg `n_vy_oath`

#### Knoten `n_vy_oath`

<!-- key: ev_vy_seryn_oath::node::n_vy_oath::text -->

- _Sprecher: Seryn Vael_

**ORIGINAL:**

> Seryn findet euch zwei Tage später, unbewaffnet, die Tempelfarben von seinem Mantel gestreift, das Licht unter seiner Haut erloschen. Seine Hände sind nicht ruhig. Seine Stimme schon. „Die Gnade verlässt mich — der letzte Griff des Gottes nach dem, was ich bin. Ich diente einer Lampe im Dunkeln, weil ich sie für die Sonne hielt. Ihr habt mir den Unterschied gezeigt und nicht triumphiert.“ Er bietet seine Klinge dar, den Griff voran. „Was von mir bleibt, ist mein, es zu geben. Es sei etwas Wahrem gegeben.“

**NEU:**

##### Option `o_vy_oath_accept` (auf Knoten `n_vy_oath`)

<!-- key: ev_vy_seryn_oath::node::n_vy_oath::option::o_vy_oath_accept::text -->

- _Bedingungen: keine_
- _Effekte: Held h_seryn dazu · Flag f_vy_seryn_recruited=true_
- _→ Ende `out_vy_oath`_

**ORIGINAL:**

> Der Ersten Klinge einen Platz geben.

**NEU:**

#### Ergebnis `out_vy_oath` — Label

<!-- key: ev_vy_seryn_oath::outcome::out_vy_oath::label -->

- _Effekte: keine_
- _Log (read-only): „Seryn Vael schließt sich Worldgate an."_

**ORIGINAL:**

> Die Erste Klinge leistet den Eid

**NEU:**

---

## 13. Folge-Ereignis (`ev_vy_gratitude`)

- _Eingereiht von: ev_vy_luminous_one · o_vy5_attack (+3T)_

### Event: Der Dank einer Welt (`ev_vy_gratitude`) · Einstieg `n_vy_gratitude`

#### Knoten `n_vy_gratitude`

<!-- key: ev_vy_gratitude::node::n_vy_gratitude::text -->

- _Sprecher: —_

**ORIGINAL:**

> Eine Delegation kommt durch das Tor unter keiner Flagge, die jemand kennt — Veyra musste bis jetzt keine erfinden. Ein provisorischer Rat, gebildet in der Stille, nachdem das Licht erlosch, sendet, was eine befreite Welt entbehren kann, und seinen Dank für einen Himmel, der endlich nur ein Himmel ist.

**NEU:**

##### Option `o_vy_gratitude_accept` (auf Knoten `n_vy_gratitude`)

<!-- key: ev_vy_gratitude::node::n_vy_gratitude::option::o_vy_gratitude_accept::text -->

- _Bedingungen: keine_
- _Effekte: funds +40_
- _→ Ende `out_vy_gratitude`_
- _Log (read-only): „Veyras provisorischer Rat sendet Tribut: Mittel +40."_

**ORIGINAL:**

> Den Tribut annehmen.

**NEU:**

#### Ergebnis `out_vy_gratitude` — Label

<!-- key: ev_vy_gratitude::outcome::out_vy_gratitude::label -->

- _Effekte: keine_

**ORIGINAL:**

> Eine Welt sagt Danke

**NEU:**

---

## README — Rückspiel-Konverter

Dieses Dokument ist rundlauffähig. Ein Konverter liest es und schreibt ausgefüllte **NEU**-Felder zurück in die Quell-JSON:

- **Anker.** Jede editierbare Passage trägt genau eine Marke `<!-- key: <SCHLÜSSEL> -->`.
  Der Schlüssel kodiert den JSON-Pfad und ist stabil (nicht verändern):

  ```
  <event>::node::<nodeId>::text                       → nodes[nodeId].text
  <event>::node::<nodeId>::option::<optId>::text      → nodes[nodeId].options[optId].text
  <event>::outcome::<outId>::label                    → outcomes[outId].label
  <event>::outcome::<outId>::debrief                  → outcomes[outId].debrief
  ```

- **Anwendung.** Der Konverter nimmt pro Anker den Text zwischen der Zeile `**NEU:**` und dem nächsten Anker bzw. der nächsten Überschrift, entfernt umschließenden Leerraum und die `> `-Blockzitat-Präfixe (falls vorhanden).
  - Ist das Ergebnis **leer**, bleibt die Quelle unverändert.
  - Ist es **nicht leer**, überschreibt es exakt das durch den Schlüssel bezeichnete Feld in `src/data/content/events.json`.
- **Nur diese Felder** werden zurückgeschrieben: Knoten-`text`, Options-`text`, Ergebnis-`label`, Ergebnis-`debrief`. **ORIGINAL**-Blöcke, Kontextzeilen (Sprecher/Bedingungen/Effekte) und **Log-Texte** sind read-only und werden nie geändert.
- **IDs bleiben unberührt.** Der Konverter ändert ausschließlich Textwerte, nie `id`/`flag`/`variable`/`next`/Struktur. Nach dem Rückspiel gilt die normale DoD (Golden Tests, `validate-content`) — spec-gepinnte Kanon-Strings (z. B. Ergebnis-Labels von `ev_vy_arrival`, Intro-Log) nur mit passender Test-Aktualisierung ändern.
