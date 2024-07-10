
# PyRacantha

PyRacantha is a VS Code extension designed to help you set up the basic structure for your Python projects and standardize them. It provides functionalities for creating project structures, analyzing existing projects, and updating `requirements.txt` based on imported packages.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **Create Python Project Structure**: Create a standard Python project structure in a selected folder.
- **Analyze Python Project**: Analyze an existing Python project and identify missing elements based on a predefined configuration.
- **Update Requirements**: Update the `requirements.txt` file based on the project's imported packages.

## Installation

To install the extension, download the latest release and add it to your VS Code extensions folder.

## Usage

### Create Python Project Structure

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
2. Type `Create Python Project Structure` and select the command.
3. Enter the project name when prompted.
4. Select a folder where the project should be created.
5. Choose whether to add the project to an existing workspace or create a new workspace:
   - **Yes, add to the existing workspace**: Adds the new project to the current workspace.
   - **No, create a new workspace**: Creates a new workspace with the specified name and adds the new project to it.

### Analyze Python Project

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
2. Type `Analyze Python Project` and select the command.
3. Select the project folder to analyze.
4. The extension will identify missing directories and files based on the predefined configuration and prompt you to add them.

### Update Requirements

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
2. Type `Update Requirements` and select the command.
3. Select the project folder to update.
4. The extension will analyze the project's imports and update the `requirements.txt` file with any missing packages.

### Multi-select Packages to Add

When updating the `requirements.txt` file, if there are many packages to add, a multi-select quick pick window will be displayed. The user can select which packages to add from the list of identified missing packages.

## Configuration

PyRacantha uses a configuration file to define the standard project structure. By default, the configuration file is located at `${workspaceFolder}/.vscode/pyracantha-config.json`.

### Default Configuration

```json
{
    "directories": ["src", "tests", "docs", "configs"],
    "files": {
        ".gitignore": "venv\n__pycache__\n*.pyc\n.DS_Store\n",
        "requirements.txt": "",
        "README.md": "# Project Title\n\nA brief description of your project.\n",
        "src/__init__.py": "",
        "tests/__init__.py": ""
    }
}
```

## Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a new Pull Request

## License

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions: The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.


## Contact

For any questions or suggestions, please contact:

- Name: Yann Ortodoro
- Email: yann.ortodoro@gmail.com
- GitHub: [Yann-0](https://github.com/Yann-0)
