import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Represents a localization object with key-value pairs.
 */
interface Localization {
    [key: string]: string;
}

let localization: Localization = {};

/**
 * Loads the localization data based on the current language setting in VS Code.
 * If the localization file for the current language is found, it is loaded.
 * Otherwise, the default localization file (English) is loaded.
 */
export function loadLocalization() {
    const locale = vscode.env.language;
    const localizationPath = path.join(__dirname, '..', 'locales', `${locale}.json`);

    if (fs.existsSync(localizationPath)) {
        const content = fs.readFileSync(localizationPath, 'utf-8');
        localization = JSON.parse(content);
    } else {
        const defaultLocalizationPath = path.join(__dirname, '..', 'locales', 'en.json');
        const content = fs.readFileSync(defaultLocalizationPath, 'utf-8');
        localization = JSON.parse(content);
    }
}

/**
 * Translates the given key to its corresponding localized value.
 * If the key is not found in the localization data, the key itself is returned.
 * @param key - The key to be translated.
 * @returns The translated value or the key itself if not found.
 */
export function msgTranslation(key: string): string {
    return localization[key] || key;
}
