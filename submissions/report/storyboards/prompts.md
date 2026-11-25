# Storyboard prompts

The three storyboards were generated in Gemini from panel-by-panel scripts written in Claude Code. The scripts take their on-screen text from the code, so the panels show the real UI wording:

| UI text | Source |
| --- | --- |
| "Not feeling this one?", "Or say it in your own words", "Dislike without a reason" / "Submit" | `src/app/components/MusicPlayer/components/ReasonPanel/ReasonPanel.tsx` |
| Chip labels ("Too slow" … "Too electronic") and the toast's effects ("faster tempo" …) | `src/utils/reasonChips.ts` |
| Toasts ("Noted: …", "Saved. Typed reasons are listed but don't steer yet.") | `src/utils/reasonConfirmationText.ts` |
| "Steering this session: …", "Nothing is steering Up next yet" | `src/utils/effectsSummary.ts` |
| "Because you listen to … Closest to your taste in …" | `src/utils/explanationText.ts` |
| "… can come up again" | `src/app/components/MusicPlayer/components/PlayerTabs/components/DislikesList/DislikesList.tsx` |

Artist and track names are made up. Each image was checked panel by panel against its script, and fixed with follow-up prompts where it was wrong (see "Checks and fixes" below).

## Style (sent first in each chat)

```
I'm going to ask you for three storyboards for a university HCI project: a music player web app that explains why each track was recommended, and lets the listener say why they're rejecting it. Use this style for all three:

- Bright, cheerful flat illustration in a soft pastel palette (peach, mint, lavender, baby blue, butter yellow). Clean outlines, white background, thin panel borders, a panel number in each corner.
- 4 panels in a 2×2 grid, each with a short caption strip underneath.
- The same character in every panel: a young woman, a university student in her early 20s, wearing a pastel hoodie and over-ear headphones, at a laptop in a cosy, bright room.
- The app UI on the laptop stays simple and monochrome so it matches the real app: white background, black text, light grey rounded buttons, black for selected buttons and the main button. Album covers are plain pastel squares.
- Draw only the UI I describe. Don't add extra buttons, tags, badges, menus or logos.
- On-screen text is the most important thing. Spell it exactly as I give it inside quotation marks, letter for letter. Make UI text large enough to read easily, zooming in on the screen if needed. Show fewer list items rather than shrink or garble text.
```

S2 and S3 were made in fresh chats with the earlier storyboards attached as style references.

## S1: Steering with a chip (built)

```
Storyboard 1: "Steering with a chip". A casual listener uses a preset reason to steer their discovery queue.

Panel 1: The student relaxes at her laptop. A close-up of the screen shows a music player bar with the track "Slow Harbour" by "Lena Moss". Directly under the bar is a black strip, tall enough to read clearly, with white text: "Because you listen to Lena Moss. Closest to your taste in mood and acoustic". Thought bubble: "Nice… but too slow for right now."
Caption: "The player explains why each track was picked."

Panel 2: Her cursor clicks a thumbs-down icon. The player has expanded to fill the screen. On the right is a card headed "Not feeling this one?" with a 2-column grid of paired buttons, ALL unselected and light grey: "Too slow" | "Too fast", "Too mellow" | "Too intense", "Too gloomy" | "Too upbeat", "Too acoustic" | "Too electronic". Below them are one wide grey button "Not a fan of this artist", a text box with the placeholder "Or say it in your own words", and a wide black button "Dislike without a reason".
Caption: "Thumbs down opens the reason panel."

Panel 3: The same card. Only "Too slow" is now selected (black with white text), and the wide black button at the bottom now reads "Submit". Her cursor is on "Submit".
Caption: "One tap on a reason, one tap on Submit."

Panel 4: A new track is playing: "Midday Spark" by "Active Wave", with a single pause button, a skip button and a thumbs-down (no play button). On the right, a list headed "Up next" with 5 rows; each row is only a pastel square, a track title and an artist name, with no tags or badges. A small notification in the corner reads "Noted: faster tempo." She smiles and nods along.
Caption: "The next tracks pick up the pace, and the toast shows how the reason was understood."
```

## S2: When no chip fits (panels 1–2 built, 3–4 planned)

```
Storyboard 2: "When no chip fits". She types her own reason. Use only the mouse cursor, no pointing hands.

Panels 1 and 2 show what the prototype does today. Panels 3 and 4 show planned behaviour: a small red pill-shaped label reading "PLANNED" next to the panel number, and a dashed border.

Panel 1: Expanded player. Now playing: "Northbound (Live)" by "The Parallels". She looks thoughtful: she likes this band, just not their live versions. In the "Not feeling this one?" card, all the paired buttons are unselected and light grey. She is typing in the text box, which shows: "not their live recordings". The wide black button reads "Submit".
Caption: "No chip fits, so she says it in her own words."

Panel 2: A small notification reads: "Saved. Typed reasons are listed but don't steer yet." The card area now shows a row of three tabs, "Reason", "Dislikes" and "Blocked artists", with "Dislikes" selected. Under the tabs, small grey text: "Nothing is steering Up next yet". Below that is one row: a pastel square, "Northbound (Live)", "The Parallels", and under it "“not their live recordings”" in quotes, with a small "X" on the right.
Caption: "Built: the reason is saved and listed for the session."

Panel 3 (PLANNED): Close-up of the laptop screen. The player shows the next track: "Glass City" by "The Parallels". No reason card is visible. ONE notification reads "Understood: fewer live recordings by The Parallels", with a black "Edit" button inside it.
Caption: "Planned: the system shows how it understood the reason, so she can correct it."

Panel 4 (PLANNED): Now playing: "Glass City" by "The Parallels". The "Up next" list shows: "Northbound" / "The Parallels", "Low Sun" / "The Parallels", "Neon Rush" / "Kite Engine", "Static Bloom" / "The Parallels", "Sunlit Drive" / "Ada Field". No titles say "(Live)". No notification. She looks satisfied.
Caption: "Planned: the typed reason steers Up next straight away."
```

## S3: The system gets it wrong (built)

```
Storyboard 3: "The system gets it wrong". She stacks too many reasons, the queue fills with compromises, and she recovers by removing one. Everything in this storyboard is built, so there are no "PLANNED" labels.

Panel 1: Three notifications stacked in the corner of the screen, as if they appeared one after another: "Noted: faster tempo.", "Noted: less intense.", "Noted: more upbeat." She is clicking quickly and looks a bit impatient.
Caption: "Three dislikes in a row: Too slow, Too intense, Too gloomy."

Panel 2: Close-up of the "Up next" list with exactly these 5 rows (a pastel square, title and artist only): "Paper Lanterns" / "Ada Field", "Driftwood" / "Lena Moss", "Quiet Engine" / "Kite Engine", "Half Light" / "Bright Avenue", "Soft Focus" / "The Parallels". She frowns at it, with a thought bubble: "None of these really fit…"
Caption: "Few tracks fit all three at once, so Up next fills with compromises."

Panel 3: Now playing: "Paper Lanterns" / "Ada Field". The tab bar "Reason", "Dislikes", "Blocked artists", with "Dislikes" selected. Under it, small grey text: "Steering this session: faster tempo, less intense, more upbeat". Below are three rows, each with a pastel square, a title, an artist, a reason, and a small "X" on the right:
"Slow Harbour" / "Lena Moss" / "Too slow"
"Firewall" / "Kite Engine" / "Too intense"
"Grey Morning" / "Ada Field" / "Too gloomy"
The mouse cursor is on the "X" of the "Firewall" row.
Caption: "The Dislikes tab shows every effect steering Up next at once."

Panel 4: One notification reads "Firewall can come up again". The grey summary now reads "Steering this session: faster tempo, more upbeat", and only the "Slow Harbour" and "Grey Morning" rows remain. Next to it, "Up next" shows 5 different tracks: "Neon Rush" / "Kite Engine", "Sunlit Drive" / "Ada Field", "High Tide" / "The Parallels", "Swift Move" / "Lena Moss", "Pulse" / "Bright Avenue". She looks relieved.
Caption: "Removing one dislike loosens the steering, and Up next recovers."
```

## Checks and fixes

What the first drafts got wrong, and why it mattered:

- **UI that wasn't built.** S1's Up next rows were tagged "Swapped in" (R18, Won't (yet)). Removed, so the storyboards only show built behaviour outside the PLANNED panels.
- **States the app can't be in.** S1 panel 2 had "Too slow" selected while the button still read "Dislike without a reason" (picking a chip changes it to "Submit"). S3 panel 3 showed a disliked track as Now playing (a dislike removes it from the queue). S2 panel 3 showed the interpretation while the disliked track was still playing (Submit moves on to the next track).
- **Content copied from S1.** The first S2 draft reused S1's panels 3–4.
- **Planned panels hidden.** A large diagonal "PLANNED: NOT IN PROTOTYPE" stamp covered the planned UI, so it became a small label and a dashed border.
- **Garbled text.** Misspelt names and labels were fixed where they mattered (the explanation strip, toasts). A few small typos in S1 and S2 chip text were left.
- **Style.** The first version was muted and greyscale, and was restyled to pastels with a different character.
