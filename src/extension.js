const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { loadLocalization, msgTranslation } = require('./localization');

// Logger for extension output
const logger = vscode.window.createOutputChannel('PyRacantha');

// Function to log informational messages
function logInfo(message) {
    logger.appendLine(`INFO: ${message}`);
    console.log(message);
}

// Function to log error messages
function logError(message) {
    logger.appendLine(`ERROR: ${message}`);
    console.error(message);
}

// Function to get the configuration file path from settings
function getConfigFilePath() {
    let configPath = vscode.workspace.getConfiguration().get('pyracantha.configFile');
    
    // Resolve ${workspaceFolder} placeholder
    if (configPath && configPath.includes('${workspaceFolder}')) {
        const workspaceFolder = vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : '';
        configPath = configPath.replace('${workspaceFolder}', workspaceFolder);
    }

    return configPath ? path.resolve(configPath) : '';
}

// Function to load project configuration from the JSON file
function loadProjectConfig() {
    const configFilePath = getConfigFilePath();
    if (!fs.existsSync(configFilePath)) {
        const defaultConfig = {
            directories: ["src", "tests", "docs", "configs"],
            files: {
                ".gitignore": "venv\n__pycache__\n*.pyc\n.DS_Store\n",
                "requirements.txt": "",
                "README.md": "# Project Title\n\nA brief description of your project.\n",
                "src/__init__.py": "",
                "tests/__init__.py": ""
            }
        };

        // Ensure the directory exists before creating the file
        const configDir = path.dirname(configFilePath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 4));
        logInfo(`Default config created at: ${configFilePath}`);
    }

    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    return JSON.parse(configContent);
}

// Function to validate naming conventions
function validateName(name, type) {
    const validNamePattern = type === 'file' ? /^[a-zA-Z0-9_\-\.]+$/ : /^[a-zA-Z0-9_\-]+$/;
    if (!validNamePattern.test(name)) {
        vscode.window.showErrorMessage(`Invalid ${type} name: ${name}. Only alphanumeric characters, hyphens, underscores${type === 'file' ? ', and periods' : ''} are allowed.`);
        return false;
    }
    return true;
}

// Function called when the extension is activated
function activate(context) {
    loadLocalization();

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createPythonStructure', async () => {
            const projectName = await showInputBoxWithCancel({ prompt: msgTranslation('enterProjectName') });
            if (!projectName) { return; }

            if (!validateName(projectName, 'project')) { return; }

            const projectPath = await getProjectPathFromDialog(msgTranslation('selectFolder'));
            if (!projectPath) { return; }

            const fullProjectPath = path.join(projectPath, projectName);

            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                const workspaceName = await showInputBoxWithCancel({ prompt: msgTranslation('enterWorkspaceName') });
                if (!workspaceName) { return; }

                if (!validateName(workspaceName, 'project')) { return; }

                const workspacePath = path.join(projectPath, workspaceName);
                fs.mkdirSync(workspacePath, { recursive: true });

                const workspaceFilePath = path.join(workspacePath, `${workspaceName}.code-workspace`);
                const workspaceContent = JSON.stringify({
                    folders: [
                        { path: fullProjectPath }
                    ],
                    settings: {}
                }, null, 4);
                fs.writeFileSync(workspaceFilePath, workspaceContent);

                createPythonProjectStructure(fullProjectPath);
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: true });
            } else {
                const addToExisting = await showQuickPickWithCancel(
                    [msgTranslation('addToExistingWorkspace'), msgTranslation('createNewWorkspace')],
                    { placeholder: msgTranslation('chooseWorkspaceOption') }
                );

                if (addToExisting === msgTranslation('addToExistingWorkspace')) {
                    createPythonProjectStructure(fullProjectPath);

                    const workspaceFilePath = vscode.workspace.workspaceFile
                        ? vscode.workspace.workspaceFile.fsPath
                        : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, `${path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath)}.code-workspace`);

                    if (fs.existsSync(workspaceFilePath)) {
                        const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
                        workspaceContent.folders.push({ path: fullProjectPath });
                        fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 4));
                    } else {
                        const workspaceContent = JSON.stringify({
                            folders: [
                                { path: vscode.workspace.workspaceFolders[0].uri.fsPath },
                                { path: fullProjectPath }
                            ],
                            settings: {}
                        }, null, 4);
                        fs.writeFileSync(workspaceFilePath, workspaceContent);
                    }

                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: false });
                    vscode.window.showInformationMessage(msgTranslation('projectStructureCreated'));
                    logInfo(msgTranslation('projectStructureCreated') + ' ' + fullProjectPath);
                } else {
                    const workspaceName = await showInputBoxWithCancel({ prompt: msgTranslation('enterWorkspaceName') });
                    if (!workspaceName) { return; }

                    if (!validateName(workspaceName, 'project')) { return; }

                    const workspacePath = path.join(projectPath, workspaceName);
                    fs.mkdirSync(workspacePath, { recursive: true });

                    const workspaceFilePath = path.join(workspacePath, `${workspaceName}.code-workspace`);
                    const workspaceContent = JSON.stringify({
                        folders: [
                            { path: fullProjectPath }
                        ],
                        settings: {}
                    }, null, 4);
                    fs.writeFileSync(workspaceFilePath, workspaceContent);

                    createPythonProjectStructure(fullProjectPath);
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: true });
                }
            }
        }),

        vscode.commands.registerCommand('extension.analyzePythonProject', async () => {
            const projectPath = await getProjectPathFromWorkspace(msgTranslation('enterProjectPathToAnalyze'));
            if (projectPath) {
                analyzePythonProject(projectPath);
            }
        }),

        vscode.commands.registerCommand('extension.updateRequirements', async () => {
            const projectPath = await getProjectPathFromWorkspace(msgTranslation('enterProjectPathToUpdate'));
            if (projectPath) {
                updateRequirementsTxt(projectPath);
            }
        })
    );
}

// Function to show an input box with cancel handling
async function showInputBoxWithCancel(options) {
    const inputBox = vscode.window.createInputBox();
    Object.assign(inputBox, options);

    const result = await new Promise((resolve) => {
        inputBox.onDidAccept(() => resolve(inputBox.value));
        inputBox.onDidHide(() => resolve(undefined));
        inputBox.show();
    });

    inputBox.dispose();
    return result;
}

// Function to show a quick pick with cancel handling
async function showQuickPickWithCancel(items, options) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items.map(label => ({ label }));
    Object.assign(quickPick, options);

    const result = await new Promise((resolve) => {
        quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0].label));
        quickPick.onDidHide(() => resolve(undefined));
        quickPick.show();
    });

    quickPick.dispose();
    return result;
}

// Function to show an information message with cancel handling
async function showInformationMessageWithCancel(message, options, ...items) {
    const result = await vscode.window.showInformationMessage(message, options, ...items);
    return result === undefined ? undefined : result;
}

// Function to prompt user to select a project path from the workspace folders
const getProjectPathFromWorkspace = async (prompt) => {
    const selectedFolder = await showQuickPickWithCancel(
        vscode.workspace.workspaceFolders ? 
        vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath).concat([msgTranslation('rootWorkspace')]) : 
        [msgTranslation('rootWorkspace')],
        { placeholder: prompt, canPickMany: false }
    );

    return selectedFolder && selectedFolder !== msgTranslation('rootWorkspace') ? selectedFolder : undefined;
};

// Function to prompt user to select a folder path using a dialog
const getProjectPathFromDialog = async (prompt) => {
    const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: msgTranslation('selectFolder')
    });

    if (result && result.length > 0) {
        return result[0].fsPath;
    }
    return undefined;
};

// Function to create the Python project structure
function createPythonProjectStructure(projectPath) {
    try {
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
            logInfo(msgTranslation('directoryCreated') + ': ' + projectPath);
        }

        const config = loadProjectConfig();
        const dirs = config.directories;
        const files = config.files;

        dirs.forEach(dir => {
            if (validateName(dir, 'directory')) {
                createDirectory(path.join(projectPath, dir));
            }
        });
        Object.entries(files).forEach(([file, content]) => {
            if (validateName(file, 'file')) {
                createFile(path.join(projectPath, file), content);
            }
        });

        // Update requirements.txt content
        const requirementsFilePath = path.join(projectPath, 'requirements.txt');
        if (fs.existsSync(requirementsFilePath)) {
            const additionalRequirements = 'numpy\npandas\nscikit-learn\n';
            fs.appendFileSync(requirementsFilePath, additionalRequirements);
            logInfo(msgTranslation('requirementsUpdatedWithAdditionalPackages'));
        }

        logInfo(msgTranslation('projectStructureCreated'));
    } catch (error) {
        logError(msgTranslation('failedToCreateStructure') + error.message);
        vscode.window.showErrorMessage(`${msgTranslation('failedToCreateStructure')} ${error.message}`);
    }
}

// Function to create a directory if it does not exist
function createDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(msgTranslation('directoryCreated') + ': ' + dirPath);
    }
}

// Function to create a file with specified content if it does not exist
function createFile(filePath, content) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        logInfo(msgTranslation('fileCreated') + ': ' + filePath);
    }
}

// Function to analyze an existing Python project for missing elements
async function analyzePythonProject(projectPath) {
    try {
        const config = loadProjectConfig();
        const dirs = config.directories;
        const files = config.files;

        const missingDirs = dirs.filter(dir => !fs.existsSync(path.join(projectPath, dir)));
        const missingFiles = Object.entries(files).filter(([file]) => !fs.existsSync(path.join(projectPath, file)));

        if (missingDirs.length === 0 && missingFiles.length === 0) {
            vscode.window.showInformationMessage(msgTranslation('projectIsUpToDate'));
            logInfo(msgTranslation('projectIsUpToDate'));
            return;
        }

        const summary = `${msgTranslation('missingElements')}:\n\n${missingDirs.join(', ')}\n${missingFiles.map(([file]) => file).join(', ')}`;
        const confirm = await showInformationMessageWithCancel(
            `${summary}\n\n${msgTranslation('addMissingElements')}`,
            { modal: true },
            msgTranslation('yes'), msgTranslation('no')
        );

        if (!confirm || confirm === msgTranslation('no')) {
            vscode.window.showInformationMessage(msgTranslation('noChangesMade'));
            logInfo(msgTranslation('noChangesMade'));
            return;
        }

        missingDirs.forEach(dir => {
            if (validateName(dir, 'directory')) {
                createDirectory(path.join(projectPath, dir));
            }
        });
        missingFiles.forEach(([file, content]) => {
            if (validateName(file, 'file')) {
                createFile(path.join(projectPath, file), content);
            }
        });

        // Update requirements.txt content
        const requirementsFilePath = path.join(projectPath, 'requirements.txt');
        if (fs.existsSync(requirementsFilePath)) {
            const additionalRequirements = 'numpy\npandas\nscikit-learn\n';
            fs.appendFileSync(requirementsFilePath, additionalRequirements);
            logInfo(msgTranslation('requirementsUpdatedWithAdditionalPackages'));
        }

        vscode.window.showInformationMessage(msgTranslation('missingElementsAdded'));
        logInfo(msgTranslation('missingElementsAdded'));
    } catch (error) {
        logError(msgTranslation('failedToAnalyzeProject') + error.message);
        vscode.window.showErrorMessage(`${msgTranslation('failedToAnalyzeProject')} ${error.message}`);
    }
}

// Function to update the requirements.txt file based on the project's imported packages
async function updateRequirementsTxt(projectPath) {
    try {
        const requirementsFilePath = path.join(projectPath, 'requirements.txt');
        const existingPackages = new Map();

        if (fs.existsSync(requirementsFilePath)) {
            const content = fs.readFileSync(requirementsFilePath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([a-zA-Z0-9-_]+)(==[0-9a-zA-Z.\-_]+)?$/);
                if (match) {
                    const packageName = match[1].trim();
                    const version = match[2] ? match[2].trim() : '';
                    existingPackages.set(packageName, version);
                }
            });
        }

        const importedPackages = collectImportedPackages(projectPath);
        const missingPackages = Array.from(importedPackages).filter(pkg => !existingPackages.has(pkg) && isValidPackageName(pkg));

        if (missingPackages.length === 0) {
            vscode.window.showInformationMessage(msgTranslation('noPackagesToAdd'));
            logInfo(msgTranslation('noPackagesToAdd'));
            return;
        }

        const selectedPackages = await showQuickPickMultiSelect(missingPackages, msgTranslation('selectPackagesToAdd'));

        if (!selectedPackages || selectedPackages.length === 0) {
            vscode.window.showInformationMessage(msgTranslation('noChangesMade'));
            logInfo(msgTranslation('noChangesMade'));
            return;
        }

        const newContent = selectedPackages.map(pkg => `${pkg}\n`).join('');
        fs.appendFileSync(requirementsFilePath, newContent);
        vscode.window.showInformationMessage(msgTranslation('requirementsUpdated'));
        logInfo(msgTranslation('requirementsUpdated'));
    } catch (error) {
        logError(msgTranslation('failedToUpdateRequirements') + error.message);
        vscode.window.showErrorMessage(`${msgTranslation('failedToUpdateRequirements')} ${error.message}`);
    }
}

// Function to validate if a package name is valid (not a standard library module)
function isValidPackageName(packageName) {
    const standardLibModules = loadStandardLibModules();
    return !standardLibModules.has(packageName);
}

// Function to load standard library modules from a JSON file
function loadStandardLibModules() {
    const standardLibModulesFilePath = path.join(__dirname, 'standardLibModules.json');
    const standardLibModulesContent = fs.readFileSync(standardLibModulesFilePath, 'utf-8');
    const standardLibModulesArray = JSON.parse(standardLibModulesContent);
    return new Set(standardLibModulesArray);
}

// Function to collect imported packages from the Python files in the directory
function collectImportedPackages(directory) {
    const importedPackages = new Set();

    // Recursively scan directories for Python files and collect imported packages
    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else if (file.endsWith('.py')) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const importStatements = content.match(/(?:import\s+([^\s,]+)|from\s+([^\s,]+))/g);

                if (importStatements) {
                    importStatements.forEach(statement => {
                        const packageName = statement.replace(/(?:import\s+|from\s+)([^\s,]+).*/, '$1').split('.')[0];
                        if (packageName) {
                            importedPackages.add(packageName);
                        }
                    });
                }
            }
        });
    }

    scanDirectory(directory);
    return importedPackages;
}

// Function to show a quick pick multi-select window with cancel handling
async function showQuickPickMultiSelect(items, placeholder) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items.map(label => ({ label }));
    quickPick.canSelectMany = true;
    quickPick.placeholder = placeholder;

    const result = await new Promise((resolve) => {
        quickPick.onDidAccept(() => resolve(quickPick.selectedItems.map(item => item.label)));
        quickPick.onDidHide(() => resolve(undefined));
        quickPick.show();
    });

    quickPick.dispose();
    return result;
}

// Function called when the extension is deactivated
function deactivate() {
    logInfo(msgTranslation('extensionDeactivated'));
}

module.exports = {
    activate,
    deactivate
};
