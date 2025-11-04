# Pushing Changes from this Workspace

This workspace does not have any Git remotes configured, so `git push` will fail until you add your own repository.

1. Add your remote:
   ```bash
   git remote add origin <your-repo-url>
   ```
2. Push the current branch (named `work`) to your remote:
   ```bash
   git push -u origin work
   ```

Replace `<your-repo-url>` with the SSH or HTTPS URL of your Git repository. After the remote is added once, future pushes only require:

```bash
git push
```
