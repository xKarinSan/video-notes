| Input                               | Expected Action                   |
| ----------------------------------- | --------------------------------- |
| 1)“Save this video”                   | `video_agent` only                |
| 2)“Store this video and summarize it” | `video_agent`, then `notes_agent` |
| 3)“Keep a record of this video”       | `video_agent` only                |
| 4)“Can you explain the video?”        | `video_agent`, then `notes_agent` |
| 5)“Summarize this: \[url]”            | `video_agent`, then `notes_agent` |
| 6)“I want a summary”                  | Ask for the video URL first       |


### Results
1) OK
2) OK but summary isnt given
3) OK
4) OK (overview was given)
5) Ok?
6) Not OK