## Lapp backend

Backend for https://github.com/frysztak/lapp.

In a nutshell, it does two things:

- hides secret Dropbox app credentials needed to perform initial authentication
- registers as Webhook receiver, receives folder-changed events, debounces them, and sends out SSE (Server Sent Events) to the client
