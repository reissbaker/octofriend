![octofriend](./octofriend.png)

```bash
$ npm install --global octofriend
```

TODO:

- [ ] Handle file modification time checks before prompting user to accept
  edits or file creation
- [ ] Handle file search string checking before prompting user to accept edits
- [ ] Track token usage and use high/low watermarks for managing context space
- [ ] Allow configuring a "guru mode" to call to a reasoning LLM. The LLM can
  enter guru mode by calling a `enter_mode` tool, and when in guru mode, the LLM
  can exit by calling an `exit_mode` tool. When entering guru mode, the
  LLM has to state the problem it wants to solve in guru mode; the guru mode
  version should be instructed to auto-exit once it's done. Maybe there are
  configurable modes in general? E.g. an explore mode vs a write code mode vs
  an architect mode. Let the config file handle all of that.
- [ ] Handle `<think>` tags as well as reasoning tokens in the UI
- [ ] Figure out why throwing ToolError sometimes causes crashes despite
  try/catch blocks
- [ ] Context optimization for repeated reads of the same file: only include
  the latest version of the file, much like the edit optimization
