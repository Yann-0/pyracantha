// localization.ts
import * as vscode from 'vscode';

interface Translations {
    [lang: string]: { [key: string]: string };
}

const translations: Translations = {
    'en': {
        'enterProjectName': 'Enter project name',
        'enterWorkspaceName': 'Enter workspace name',
        'selectFolder': 'Select Folder',
        'chooseWorkspaceOption': 'Choose workspace option',
        'addToExistingWorkspace': 'Add to existing workspace',
        'createNewWorkspace': 'Create new workspace',
        'projectStructureCreated': 'Project structure created',
        'enterProjectPathToAnalyze': 'Enter project path to analyze',
        'enterProjectPathToUpdate': 'Enter project path to update',
        'directoryCreated': 'Directory created',
        'fileCreated': 'File created',
        'requirementsUpdatedWithAdditionalPackages': 'requirements.txt updated with additional packages',
        'projectIsUpToDate': 'Project is up to date',
        'missingElements': 'Missing elements',
        'addMissingElements': 'Do you want to add missing elements?',
        'yes': 'Yes',
        'no': 'No',
        'noChangesMade': 'No changes were made',
        'missingElementsAdded': 'Missing elements added',
        'failedToCreateStructure': 'Failed to create project structure: ',
        'failedToAnalyzeProject': 'Failed to analyze project: ',
        'failedToUpdateRequirements': 'Failed to update requirements.txt: ',
        'extensionDeactivated': 'Extension deactivated'
    },
    'fr': {
        'enterProjectName': 'Entrez le nom du projet',
        'enterWorkspaceName': 'Entrez le nom de l’espace de travail',
        'selectFolder': 'Sélectionnez le dossier',
        'chooseWorkspaceOption': 'Choisissez l’option d’espace de travail',
        'addToExistingWorkspace': 'Ajouter à l’espace de travail existant',
        'createNewWorkspace': 'Créer un nouvel espace de travail',
        'projectStructureCreated': 'Structure du projet créée',
        'enterProjectPathToAnalyze': 'Entrez le chemin du projet à analyser',
        'enterProjectPathToUpdate': 'Entrez le chemin du projet à mettre à jour',
        'directoryCreated': 'Répertoire créé',
        'fileCreated': 'Fichier créé',
        'requirementsUpdatedWithAdditionalPackages': 'requirements.txt mis à jour avec des packages supplémentaires',
        'projectIsUpToDate': 'Le projet est à jour',
        'missingElements': 'Éléments manquants',
        'addMissingElements': 'Voulez-vous ajouter les éléments manquants?',
        'yes': 'Oui',
        'no': 'Non',
        'noChangesMade': 'Aucun changement n’a été effectué',
        'missingElementsAdded': 'Éléments manquants ajoutés',
        'failedToCreateStructure': 'Échec de la création de la structure du projet: ',
        'failedToAnalyzeProject': 'Échec de l’analyse du projet: ',
        'failedToUpdateRequirements': 'Échec de la mise à jour de requirements.txt: ',
        'extensionDeactivated': 'Extension désactivée'
    }
};

let currentLanguage = 'en';

export function loadLocalization() {
    const configLang = vscode.workspace.getConfiguration().get<string>('pyracantha.language');
    if (configLang && ['en', 'fr'].includes(configLang)) {
        currentLanguage = configLang;
    }
}

export function msgTranslation(key: string): string {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
}
