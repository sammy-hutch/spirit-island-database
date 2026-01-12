# Software Setup

Assumption is that project is using python to run queries via SQLite against a local database on a linux virtual machine (on windows), with plans to import and export data to/from the virtual machine. Accordingly, the following setup is required:
- WSL
- Anaconda
- VS Code
- git SSH connection
- Python virtual environment

Optional setup includes:
- DB Browser for SQLite on Linux


## Install Ubuntu Linux distribution on WSL to run bash/zsh shell on Windows

- Open PowerShell as Admin
- Run ```wsl --install```
- Once that’s done, reboot your machine
- Re-open PowerShell (no Admin powers needed this time)
- Run ```wsl --install -d Ubuntu```
- Once the installation is done, Ubuntu will start.
- Ubuntu will ask for a username and password, make sure to use something you’ll remember (note: when you type the password in the terminal you won’t be able to see an input being written, that’s normal)
- Once you’ve set up your username and password, you can close the Ubuntu terminal
- Go back to the PowerShell terminal, and run ```wsl --set-version Ubuntu 2```
- Once that’s done, reopen Ubuntu (you can search for the Ubuntu app in the windows search bar)
- Run ```sudo apt update```
- Run ```sudo apt upgrade```
- Run ```sudo apt install zsh```
- Run ```chsh -s $(which zsh)```
- Close Ubuntu and reopen it
- You'll be prompted with a request with 4 options. Go for option 2 "populate your .zshrc ..."
- Test that it worked: run ```echo $SHELL``` . Expected result: /bin/zsh or similar.
- Install Oh my zsh! by running  
  ```sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"```

## Recommended: Install Anaconda
- Open Ubuntu terminal
- Run ```wget https://repo.anaconda.com/archive/Anaconda3-2024.02-1-Linux-x86_64.sh```  
  (Note: you can change the link to the latest one available [here](https://www.anaconda.com/products/distribution) > Anaconda Installers section > under Linux, right click on 64-bit (x86) installer > copy link address)
- Run ```bash Anaconda3-2024.02-1-Linux-x86_64.sh``` (if you changed the above step to a new link, you'll need to change the filename in this command accordingly)
- Accept the Agreement
- Press Enter to confirm the default location
- If prompted whether to initialize Anaconda, type yes and Enter
- Restart Ubuntu

## Setup VS Code

- Download VS Code for Windows [here](https://code.visualstudio.com/download)
- Open Ubuntu
- Run ```code .```
- VS Code will open
- Go to Extensions on the side bar and install the Remote Development extensions pack (includes WSL extension)
- Close VS Code

## Setup git with a new SSH key

- In Ubuntu, run ```code .``` to open VS Code
- Open the terminal: Command bar > Terminal > Open new terminal and use this terminal for the following steps
- add your username and email to git config with the following commands:
  - ```git config --global user.name "Your Name"```
  - ```git config --global user.email "youremail@yourdomain.com"```
- Starting from step 2, follow the steps described [here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key)
- Run ```cat < ~/.ssh/id_ed25519.pub``` and copy the result
- Go to [https://github.com/settings/keys](https://github.com/settings/keys) and Click on "New SSH key"
- Paste the content from your clipboard under Key, and give it a title. Then click on "Add SSH key"

## Import Repository

- Run ```mkdir repos```. This will create a *repos* folder in your home (```~```) folder.
- Navigate to repos by running ```cd repos```
- Clone the repository  
  ```git clone git@github.com:sammy-hutch/spirit-island-database.git```
- On VS Code, go to File > Open Folder... > Navigate to the spirit-island-database folder and then press OK. VS Code will reopen showing you the content of the local repo on the file explorer.

Practical Info 1: if you want to access your WSL folder on Windows, open the Explorer and copy ```\\wsl$\Ubuntu\home\<your_ubuntu_username>``` in the address bar.
Pin your folder to Quick Access for easy access.

Practical Info 2: if you need to open VS Code on WSL again, open the Ubuntu app and run ```code repos/spirit-island-database``` to open VS Code in the spirit-island-database folder.

### Install git hooks

- Navigate to the git hooks folder ```cd .git/hooks```
- Create a commit-msg file ```touch commit-msg```
- Open the file in VS Code ```code commit-msg```
- Copy the following content in the file
  
```bash
#!/bin/sh

commit_regex='^(feat|fix|perf|refactor|style|test|chore|build|ci|docs): .+'

if ! grep -qE "$commit_regex" "$1"; then
  echo "ERROR: Commit message does not follow the required format!"
  echo "       Please start the commit message with one of these prefixes:"
  echo "       feat: fix: perf: refactor: style: test: chore: build: ci: docs:"
  echo "       For more information, visit https://tinyurl.com/43udhy4k"
  exit 1
fi

```

- Save the file (CTRL+S)
- Run ```chmod +x commit-msg```
- Navigate back to the main folder by running ```cd ...```

## Python Virtual Environment

It is good practice to setup an environment for each project you work on.
To setup a Virtual environment, follow the commands on [Conda](https://docs.conda.io/en/latest/)

- Run ```conda create -n spirit-island-database python=3.8```. You can substitute *spirit-island-database* with a name of your preference.
- Run ```conda activate spirit-island-database```
- You should now see *spirit-island-database* at the beginning of your terminal command line.  
  (**Important note:** Always run ```conda activate <env_name>``` whenever you restart the terminal to select the environment related to the project you're working on).
- the following packages are required:
  - pandas: ```conda install pandas```
  - python-dotenv: ```conda install python-dotenv```

## Install DB Browser for SQLite

steps copied from [this page](https://sqlitebrowser.org/dl/)
- open Ubuntu
- Run ```sudo add-apt-repository -y ppa:linuxgndu/sqlitebrowser```
- Run ```sudo apt-get update```
- Run ```sudo apt-get install sqlitebrowser```
- You can open DB Browser for SQLite in Ubuntu with the following command: ```sqlitebrowser```


## app setup

Install npm
```bash
...
```

Install expo-cli
```bash
npm install -g expo-cli create-expo-app
```

## Testing app
navigate to directory
```bash
cd app/SpiritIslandTracker
```

```bash
npm run web
```


