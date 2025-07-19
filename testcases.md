| Input                               | Expected Action                   |
| ----------------------------------- | --------------------------------- |
| “Save this video”                   | `video_agent` only                |
| “Store this video and summarize it” | `video_agent`, then `notes_agent` |
| “Keep a record of this video”       | `video_agent` only                |
| “Can you explain the video?”        | `video_agent`, then `notes_agent` |
| “Summarize this: \[url]”            | `video_agent`, then `notes_agent` |
| “I want a summary”                  | Ask for the video URL first       |
