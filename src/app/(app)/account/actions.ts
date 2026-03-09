'use server'

import fs from 'fs/promises'
import path from 'path'

export async function getMarkdownContent(filename: string) {
    try {
        const filePath = path.join(process.cwd(), 'Support', filename)
        const content = await fs.readFile(filePath, 'utf8')
        return content
    } catch (error) {
        console.error(`Failed to read markdown file: ${filename}`, error)
        return 'Failed to load content. Please try again later.'
    }
}
