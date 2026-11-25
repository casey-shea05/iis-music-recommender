# Glossary

**Reason**
What a user gives after disliking a track to say why it missed: a chip or free text. Each reason belongs to the track it was given on.
_Avoid_: feedback, rating

**Adjustment**
What a reason is interpreted into: a direction on one feature (e.g. tempo up) or a block on an artist. Each adjustment has a scope: this session or long-term. One reason can produce several adjustments.
_Avoid_: rule, filter, preference

**Effect**
The merged result of all active adjustments on one feature, as shown in the Active reasons strip. The latest reason on a feature wins; different features combine.
_Avoid_: setting, active reason

**Conflict**
A track goes against an effect when its feature sits on the wrong side of it (e.g. slower than an effect asking for faster). The further it sits, the stronger the conflict. Conflicts lower a track's ranking; they never remove it.
_Avoid_: violation, mismatch

**Closest fit**
A track brought into Up next that still conflicts with an effect, because nothing better was available. It is always tagged so the user can see the compromise.
_Avoid_: fallback, no match

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
The record of tracks already played in this session. It only grows until the session ends: moving the cursor back to a Heard track doesn't remove anything from it, so a track can be both Heard and Up next.
_Avoid_: history, played

**Fresh track**
A catalogue track that isn't in this session's queue yet. When Up next runs short, fresh tracks are added to the end of the queue.
_Avoid_: new track, unheard track

**Start new queue**
The action that ends the current session and begins another: Heard is emptied and the queue starts again from its first track. Session-scoped adjustments end with it; long-term ones carry over.
_Avoid_: reset, refresh

**Anchor artist**
The artist an explanation cites as the reason a track was picked: one of the user's top artists whose music led to the recommendation.
_Avoid_: seed, source artist

**Feature**
A measurable property of a track that adjustments act on and explanations cite, such as tempo, intensity or acousticness.
_Avoid_: attribute, tag
