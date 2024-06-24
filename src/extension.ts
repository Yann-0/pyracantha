import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { loadLocalization, msgTranslation } from './localization';

/**
 * Represents the configuration of a project.
 */
interface ProjectConfig {
	directories: string[];
	files: { [key: string]: string };
}

/**
 * Represents a function that prompts the user for a project path.
 */
type ProjectPathPrompt = (prompt: string) => Promise<string | undefined>;

/**
 * The logger output channel for PyRacantha.
 */
const logger = vscode.window.createOutputChannel('PyRacantha');

/**
 * Logs an informational message to the logger and console.
 * @param message The message to log.
 */
function logInfo(message: string) {
	logger.appendLine(`INFO: ${message}`);
	console.log(message);
}

/**
 * Logs an error message to the logger and console.
 * @param message The error message to log.
 */
function logError(message: string) {
	logger.appendLine(`ERROR: ${message}`);
	console.error(message);
}

/**
 * Activates the PyRacantha extension.
 * @param context The extension context.
 */
export function activate(context: vscode.ExtensionContext) {
	loadLocalization();

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.createPythonStructure', async () => {
			const projectPath = await getProjectPath(msgTranslation('enterProjectPath'));
			if (projectPath) {
				createPythonProjectStructure(projectPath);
				vscode.window.showInformationMessage(msgTranslation('projectStructureCreated'));
				logInfo(msgTranslation('projectStructureCreated') + ' ' + projectPath);
			}
		}),

		vscode.commands.registerCommand('extension.analyzePythonProject', async () => {
			const projectPath = await getProjectPath(msgTranslation('enterProjectPathToAnalyze'));
			if (projectPath) {
				analyzePythonProject(projectPath);
			}
		}),

		vscode.commands.registerCommand('extension.updateRequirements', async () => {
			const projectPath = await getProjectPath(msgTranslation('enterProjectPathToUpdate'));
			if (projectPath) {
				updateRequirementsTxt(projectPath);
			}
		})
	);
}

/**
 * Prompts the user for a project path.
 * @param prompt The prompt message.
 * @returns A promise that resolves to the selected project path, or undefined if no path was selected.
 */
const getProjectPath: ProjectPathPrompt = async (prompt: string): Promise<string | undefined> => {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const selectedFolder = await vscode.window.showQuickPick(
			vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath),
			{ placeHolder: msgTranslation('selectProjectPath'), canPickMany: false }
		);
		return selectedFolder || vscode.workspace.workspaceFolders[0].uri.fsPath;
	} else {
		return await vscode.window.showInputBox({ prompt });
	}
}

/**
 * Creates the Python project structure at the specified project path.
 * @param projectPath The path of the project.
 */
function createPythonProjectStructure(projectPath: string) {
	try {
		const config = vscode.workspace.getConfiguration('pythonProjectStructure') as unknown as ProjectConfig;
		const dirs: string[] = config.directories;
		const files: { [key: string]: string } = config.files;

		dirs.forEach(dir => createDirectory(path.join(projectPath, dir)));
		Object.entries(files).forEach(([file, content]) => createFile(path.join(projectPath, file), content));
		logInfo(msgTranslation('projectStructureCreated'));
	} catch (error) {
		logError(msgTranslation('failedToCreateStructure') + (error as Error).message);
		vscode.window.showErrorMessage(`${msgTranslation('failedToCreateStructure')} ${(error as Error).message}`);
	}
}

/**
 * Creates a directory at the specified path.
 * @param dirPath The path of the directory to create.
 */
function createDirectory(dirPath: string) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		logInfo('Directory created: ' + dirPath);
	}
}

/**
 * Creates a file at the specified path with the given content.
 * @param filePath The path of the file to create.
 * @param content The content of the file.
 */
function createFile(filePath: string, content: string) {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, content);
		logInfo('File created: ' + filePath);
	}
}

/**
 * Analyzes the Python project at the specified project path.
 * @param projectPath The path of the project.
 */
async function analyzePythonProject(projectPath: string) {
	try {
		const config = vscode.workspace.getConfiguration('pythonProjectStructure') as unknown as ProjectConfig;
		const dirs: string[] = config.directories;
		const files: { [key: string]: string } = config.files;

		const missingDirs = dirs.filter(dir => !fs.existsSync(path.join(projectPath, dir)));
		const missingFiles = Object.entries(files).filter(([file]) => !fs.existsSync(path.join(projectPath, file)));

		if (missingDirs.length === 0 && missingFiles.length === 0) {
			vscode.window.showInformationMessage(msgTranslation('projectIsUpToDate'));
			logInfo(msgTranslation('projectIsUpToDate'));
			return;
		}

		const summary = `${msgTranslation('missingElements')}:\n\n${missingDirs.join(', ')}\n${missingFiles.map(([file]) => file).join(', ')}`;
		const confirm = await vscode.window.showInformationMessage(
			`${summary}\n\n${msgTranslation('addMissingElements')}`,
			{ modal: true },
			'Yes', 'No'
		);

		if (confirm === 'Yes') {
			missingDirs.forEach(dir => createDirectory(path.join(projectPath, dir)));
			missingFiles.forEach(([file, content]) => createFile(path.join(projectPath, file), content));
			vscode.window.showInformationMessage(msgTranslation('missingElementsAdded'));
			logInfo(msgTranslation('missingElementsAdded'));
		} else {
			vscode.window.showInformationMessage(msgTranslation('noChangesMade'));
			logInfo(msgTranslation('noChangesMade'));
		}
	} catch (error) {
		logError(msgTranslation('failedToAnalyzeProject') + (error as Error).message);
		vscode.window.showErrorMessage(`${msgTranslation('failedToAnalyzeProject')} ${(error as Error).message}`);
	}
}

/**
 * Updates the requirements.txt file in the specified project path based on the imported packages in the project.
 * @param projectPath The path of the project.
 */
async function updateRequirementsTxt(projectPath: string) {
	try {
		const requirementsFilePath = path.join(projectPath, 'requirements.txt');
		const existingPackages = new Map<string, string>();

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
		const missingPackages = Array.from(importedPackages).filter(pkg => !existingPackages.has(pkg));

		if (missingPackages.length === 0) {
			vscode.window.showInformationMessage(msgTranslation('noPackagesToAdd'));
			logInfo(msgTranslation('noPackagesToAdd'));
			return;
		}

		const summary = `${msgTranslation('missingPackages')}:\n${missingPackages.join('\n')}`;
		const confirm = await vscode.window.showInformationMessage(
			`${summary}\n\n${msgTranslation('addPackages')}`,
			{ modal: true },
			'Yes', 'No'
		);

		if (confirm === 'Yes') {
			const newContent = missingPackages.map(pkg => `${pkg}\n`).join('');
			fs.appendFileSync(requirementsFilePath, newContent);
			vscode.window.showInformationMessage(msgTranslation('requirementsUpdated'));
			logInfo(msgTranslation('requirementsUpdated'));
		} else {
			vscode.window.showInformationMessage(msgTranslation('noChangesMade'));
			logInfo(msgTranslation('noChangesMade'));
		}
	} catch (error) {
		logError(msgTranslation('failedToUpdateRequirements') + (error as Error).message);
		vscode.window.showErrorMessage(`${msgTranslation('failedToUpdateRequirements')} ${(error as Error).message}`);
	}
}

/**
 * Collects the imported packages in the specified directory.
 * @param directory The directory to scan for imported packages.
 * @returns A set of imported package names.
 */
function collectImportedPackages(directory: string): Set<string> {
	const importedPackages = new Set<string>();

	function scanDirectory(dir: string) {
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

/**
 * Deactivates the PyRacantha extension.
 */
export function deactivate() {
	logInfo(msgTranslation('extensionDeactivated'));
}
