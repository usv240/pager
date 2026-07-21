# Pager User-Test Protocol

## Purpose

Collect lightweight, honest evidence that a first-time learner can understand Pager's verification loop. This is usability feedback, not a study of engineering ability.

## Who to invite

Ask 3-5 students, early-career developers, or developers who use AI coding tools. Do not coach them through the task and do not collect secrets, employer information, or personal data beyond an optional first name/role.

## Ten-minute session

1. Send the participant to the deployed Pager URL in a desktop Chromium browser.
2. Ask them to open **The Invoice Queue Retry** and think aloud.
3. Say only: **"Please find what must stay true, decide which repair you would ship, and use Pager to prove it."**
4. Do not explain the invariant, suggest a repair option, or tell them where to click unless they are blocked for more than two minutes. Record the block neutrally.
5. After they finish, ask the four questions below.

## Questions

1. What did you believe the success condition was before you changed code?
2. What made one repair feel unsafe or safe?
3. What did the verification result prove that the code diff alone did not?
4. What was confusing, unnecessary, or missing from the workspace?

## Capture sheet

| Participant | Completed loop | Identified invariant | Used repair diff | Understood verification | Friction observed | One quote |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | yes/no | yes/no | yes/no | yes/no | | |
| P2 | yes/no | yes/no | yes/no | yes/no | | |
| P3 | yes/no | yes/no | yes/no | yes/no | | |

## How to use findings

- Use only truthful, anonymized observations in the Devpost description or demo.
- If more than one participant misses the invariant or cannot find verification, fix that product issue before recording.
- Do not present small-sample feedback as a validated learning outcome; describe it as usability feedback.

## Submission-ready statement

Use only after completing the sessions:

> We conducted lightweight usability sessions with first-time learners. Participants were asked to identify the invariant, judge a repair, and verify it without coaching. Their feedback informed our final clarity and navigation polish.
