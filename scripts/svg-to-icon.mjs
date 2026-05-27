import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="140" y1="80" x2="860" y2="940" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5D8BFF"/>
      <stop offset="1" stop-color="#396AFC"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>
  <path d="M268 190C268 157 295 130 328 130H470C658 130 792 258 792 440C792 622 658 750 470 750H430V842C430 875 403 902 370 902C337 902 310 875 310 842V232C310 209 291 190 268 190Z" fill="white"/>
  <path d="M510 314C396 314 320 392 320 494C320 592 396 670 510 670C544 670 574 664 602 650L662 690L648 622C696 590 724 546 724 494C724 392 624 314 510 314Z" fill="url(#bg)"/>
  <circle cx="408" cy="176" r="34" fill="white"/>
  <circle cx="612" cy="176" r="34" fill="white"/>
  <path d="M404 266C442 214 478 192 512 192C546 192 582 214 620 266" stroke="white" stroke-width="26" stroke-linecap="round"/>
  <path d="M512 88V52" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <path d="M450 108L430 78" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <path d="M574 108L594 78" stroke="white" stroke-width="16" stroke-linecap="round"/>
</svg>`

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } })
const png = resvg.render().asPng()
writeFileSync('assets/icon.png', png)
console.log('✓ assets/icon.png oluşturuldu (1024x1024)')
