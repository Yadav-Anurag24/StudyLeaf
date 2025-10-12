---
date: 2025-10-10
---

*How to push your project to Github?*

#. First create a Repo of your project on Github.

#. After that do these following commands to push the project to the Github:

#. Initialize a git repository
```c
git init -b main
```

#. Add all your files to be tracked
```c
git add .
```
#. Create your first commit
```c
git commit -m "Initial version of StudyLeaf project"
```
#. Link it to your GitHub repository
```c
git remote add origin <YOUR_GITHUB_REPO_URL>
```
#. Push your code to GitHub
```c
git push -u origin main
```

#. Now The project is pushed to the Github.

# Update your github repository  when any updation is made in the project code:

Follow these commands:

#. You can see which files you've modified by running:
```c
git status
```

#. Stage Your Changes
```c
git add .
```

#. Commit Your Changes
```c
git commit -m "Updated information"
```

#. Push to GitHub
```c
git push origin main
```


