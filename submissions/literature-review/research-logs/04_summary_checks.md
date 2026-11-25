# Summary checks

For two verified papers: the assistant's three-sentence summary of the abstract, and your mark on each sentence.

Prompt:

```
Here is the abstract of a paper I have verified: <paste abstract>.

Summarise it in three sentences: what they did, what they found, what it means for <my problem>. Do not add anything that is not in the abstract.
```

Marks: SUPPORTED (write the abstract phrase beside it) · NOT IN ABSTRACT (strike it, or keep it marked as your own inference) · CONTRADICTED (the abstract says otherwise: strike it and log it).

My problem: `whether letting users give a reason when rejecting a recommended track, and showing why it was picked, improves their sense of control.`

## Paper 1: Gratzer, P. (2025). Music Recommendation Systems … and How They Want to be Used. International Journal of Human–Computer Interaction.

| Sentence | Mark | Abstract phrase, or note |
|---|---|---|
| 1. The study used focus groups and in-situ diaries with 19 participants to examine how people use music recommendation features, looking at their goals, experiences and contexts | **SUPPORTED** | "Using a qualitative approach (focus groups, in-situ diaries, n = 19), this study examines user interactions with music recommendation features (MRFs), focusing on their goals, experiences, and contexts" |
| 2. It found that satisfaction depends on perceived controllability as well as content quality, that the need for control rises with goal specificity and falls when intentions are vague, and that participants wanted tools to influence both content and recommendation strategy | **SUPPORTED** | "satisfaction with MRFs depends not only on content quality but also on perceived controllability"; "Control needs rose with goal specificity and receded when intentions were vague"; "Participants desired tools to influence both content and recommendation strategy." |
| 3. For the question of giving reasons for rejections and showing why a track was picked, this suggests that control features matter for satisfaction but that how much control people want varies by situation, so such features may need to adapt to context | **NOT IN ABSTRACT** (partly supported) | The abstract supports that control needs shift by situation ("the need for control over music selection shifts across different situations"). The rest is AI inference: the abstract says nothing about giving reasons for rejections or showing why a track was picked (those words came from the problem statement I gave the AI), and "such features may need to adapt to context" is the AI's conclusion. The abstract's own design proposal is "a mode switch with an adjustable search radius". |

## Paper 2: Abel, E., & Goddard, A. (2023). A Live Concert Performance Recommender System Utilizing User Ideal and Antithesis Ideal Setlist Preferences.

| Sentence | Mark | Abstract phrase, or note |
|---|---|---|
| 1. The authors propose CPR, a recommender for historic live concert recordings in which fans define ideal setlist songs and negative ideal songs (the antithesis of an ideal concert), and can add semantic information about why they chose them | **SUPPORTED** | "CPR provides an artist's fan the ability to define preferences via the notion of ideal setlist songs"; "negative ideal setlist songs, denoting songs that would represent part of the antithesis of an ideal concert for the user"; "The user can then define additional semantic information regarding why the ideal and negative ideal setlist songs have been chosen." |
| 2. The system recommends the concerts that best align with those preferences and explains each recommendation in terms of how it matches them, so users can explore and fine-tune their preferences and results | **SUPPORTED** | "recommend live concerts by the artist that are most aligned to the user's preferences"; "A user is provided with explanations regarding the whys behind potential recommendations"; "Such explainability aids a user to then interactively explore and fine tune their preferences and recommendation results." (Minor: the abstract says "potential recommendations", the summary says "each recommendation".) |
| 3. For the research question, this is a close design precedent, since users give reasons for negative choices and see why items were recommended, but the abstract reports no evaluation, so it can't show whether this improves sense of control | **NOT IN ABSTRACT** (partly supported) | The first half is supported by the abstract (users give reasons for negative ideal songs and get explanations of recommendations). "Close design precedent" is AI inference. "Reports no evaluation" is only true of the abstract: its silence doesn't show the full paper has no evaluation, so it needs checking against the paper before relying on it. |