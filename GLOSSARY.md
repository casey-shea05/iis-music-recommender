# Glossary

**Reason**
What a user gives after disliking a track to say why it missed: a chip or free text. Each reason belongs to the track it was given on.
_Avoid_: feedback, rating

**Reason panel**
The always-present panel in the expanded player where the user picks reasons for Now playing and submits them. Submitting with nothing picked is a Dislike with no reasons. Nothing is recorded until Submit, and the panel resets whenever Now playing changes.
_Avoid_: reason prompt, dislike dialog

**Dislikes panel**
A tab beside the Reason panel in the expanded player, listing the Dislikes of this session with their reasons, under a summary of the current effects. A Dislike whose only reason is "Not a fan of this artist" is listed in the Blocked artists panel instead. Removing a Dislike there drops all its reasons and lets the track come up again, but never unblocks an artist: if it still carries the artist reason, the track stays hidden until the artist is unblocked. It is disabled while there are no Dislikes, unless it is already open: then it stays open, empty, until the user leaves it.
_Avoid_: reasons panel, history

**Blocked artists panel**
A third tab beside the Reason and Dislikes panels, listing each Blocked artist once, with the tracks that blocked them and an Unblock button. It is disabled while no artist is blocked, and after a reload (when only blocks remain) it is the tab with content.
_Avoid_: blocklist, artist settings

**Dislike**
The record of a track the user rejected, with any reasons given on it (none is allowed). It is created when the user submits the Reason panel, and the track leaves the queue and Heard at that moment. While the record exists the track can't come up again. Removing it drops all its reasons and lets the track come up again. A Dislike lasts one session; it can carry the "Not a fan of this artist" reason, but the block it creates is a separate thing (see Blocked artist).
_Avoid_: thumbs-down, ban

**Adjustment**
What a feature reason is interpreted into: a direction on one feature (e.g. tempo up), measured from the disliked track. Adjustments last this session. The "Not a fan of this artist" reason creates a Blocked artist instead, and typed reasons don't create adjustments yet. One Dislike can produce several adjustments.
_Avoid_: rule, filter, preference

**Effect**
The merged result of all active adjustments on one feature, as summarised at the top of the Dislikes panel. The latest reason on a feature wins; different features combine.
_Avoid_: setting, active reason

**Conflict**
A track goes against an effect when its feature sits on the wrong side of it (e.g. slower than an effect asking for faster). The further it sits, the stronger the conflict. Conflicts lower a track's ranking; they never remove it.
_Avoid_: violation, mismatch

**Closest fit**
An unheard Up next track that still conflicts with an effect, because nothing better was available. It follows the current effects: removing an effect means tracks that no longer conflict stop being Closest fits. Tagging them in Up next is planned, not built.
_Avoid_: fallback, no match

**Blocked artist**
The primary (first-listed) artist of a track disliked with "Not a fan of this artist". Any track crediting a blocked artist is excluded from Up next. The block is long-term and stands on its own: it survives the session, and removing the Dislike it came from does not lift it. Only Unblock in the Blocked artists panel does; that also drops the "Not a fan" reason from any Dislike of this session that carries it.
_Avoid_: banned artist, muted artist

**Session**
One run of the discovery queue, from Start new queue (or opening the app) until the next. Session-scoped adjustments end with it; long-term ones carry over.
_Avoid_: playlist, run

**Queue**
The one ordered list of tracks in a session, with a cursor on the track Now playing. Everything after the cursor is Up next. Moving the cursor back (replaying a Heard track) removes nothing: the tracks after it stay in Up next.
_Avoid_: track list, playlist

**Now playing**
The track at the queue's cursor.
_Avoid_: current song

**Up next**
The tracks after the cursor, waiting to be played.
_Avoid_: upcoming, backlog

**Heard**
The record of tracks already played in this session. It only grows until the session ends, with one exception: disliking a track removes it from Heard too. Moving the cursor back to a Heard track doesn't remove anything from it, so a track can be both Heard and Up next.
_Avoid_: history, played

**Fresh track**
A catalogue track that isn't in this session's queue yet. When Up next runs short, fresh tracks are added to the end of the queue.
_Avoid_: new track, unheard track

**Start new queue**
The action that ends the current session and begins another: Heard is emptied and the queue starts again from its first track. Session-scoped adjustments end with it; long-term ones carry over.
_Avoid_: reset, refresh

**Catalogue**
The fixed snapshot of tracks the app can recommend, built once from the user's own listening: their top tracks plus tracks by artists similar to their top artists. Every track has its audio features. The app never asks a recommender for more during a session; steering only re-ranks the catalogue.
_Avoid_: library, database, track pool

**Taste profile**
The average features of the user's top tracks alone. Recommended tracks never feed into it, so the quality of the catalogue does not change the profile. Similarity and explanations are measured against it.
_Avoid_: user model, preferences

**Anchor artist**
The artist an explanation cites as the reason a track was picked: one of the user's top artists whose music led to the recommendation.
_Avoid_: seed, source artist

**Feature**
A measurable property of a track that adjustments act on and explanations cite, such as tempo, intensity or acousticness.
_Avoid_: attribute, tag

**Explanation**
What Now playing shows to say why the track was picked: its anchor artist plus the one or two features closest to the user's taste. It claims closeness, not a match. Only the track playing has one.
_Avoid_: reason (that is the user's), justification
