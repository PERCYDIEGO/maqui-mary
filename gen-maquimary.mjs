import { writeFileSync } from 'fs'

const prompt = `Professional brand logo for "Maqui Mary" Peruvian cleaning products company, sponges and cleaning accessories, modern flat design, deep blue and golden yellow color palette, stylized sponge icon, bold sans-serif typography, white background, clean and trustworthy, suitable for product packaging`

const encoded = encodeURIComponent(prompt)
const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&seed=42`

console.log('🎨 Generando imagen con Pollinations (Flux model)...')

const response = await fetch(url)

if (!response.ok) {
  console.error('Error HTTP:', response.status, response.statusText)
  process.exit(1)
}

const buffer = Buffer.from(await response.arrayBuffer())
writeFileSync('D:/proyectos_opencode/projects/maquimary-brand.png', buffer)
console.log('✅ Imagen guardada en: D:/proyectos_opencode/projects/maquimary-brand.png')
