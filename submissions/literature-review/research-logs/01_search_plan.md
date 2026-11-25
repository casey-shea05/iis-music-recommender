# Search plan

Problem sentence:  People discovering music through recommended playlists struggle to steer what they hear next because the system can't tell why they skipped or disliked a track.

## Concept blocks (two or three terms each; take synonyms from the first abstracts you read)

| Block | What it covers | Terms |
|---|---|---|
| A | the person's behaviour | user control, user feedback, critiquing, steering |
| B | the system's property | explanation, transparency, scrutability |
| C | the setting | recommender system, music recommendation, playlist |

## One natural-language question (for tools that read questions)

Does letting people give a reason when they reject a recommended track, and showing why it was picked, improve their sense of control over music recommendations?


## One Boolean query (for tools that match strings: OR inside a block, AND between blocks)

```
("user control" OR "user feedback" OR critiquing OR steering)
AND (explanation OR explainable OR transparency OR scrutability)
AND ("recommender system" OR "music recommendation" OR playlist)
```

A block with no synonyms is probably your project's name, not a concept.
