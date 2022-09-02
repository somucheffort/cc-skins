const express = require('express')
const axios = require('axios')
const fs = require('fs').promises
const Canvas = require('canvas')
const app = express()

const minSize = 8
const maxSize = 2048

const loadImage = url => {
  return new Promise((resolve, reject) => {
    const img = new Canvas.Image()

    img.onload = () => resolve(img)
    img.onerror = e => reject(e)

    axios
      .get(url, {
        responseType: 'arraybuffer'
      })
      .then(response => {
        img.src = Buffer.from(response.data, 'binary')
      })
      .catch(e => reject(e))
  })
}

const loadDefaultSkin = () => {
  return new Promise((resolve, reject) => {
    const img = new Canvas.Image()

    img.onload = () => resolve(img)
    img.onerror = e => reject(e)

    fs.readFile('./default.png', 'binary')
      .then(data => {
        img.src = Buffer.from(data, 'binary')
      })
      .catch(e => reject(e))
  })
}

const render = settings => {
  loadImage(`${settings.skinURL}${settings.u}.png`)
  .then(texture => {
    drawSkin(texture, settings)
  })
  .catch(e => {
    console.error(e)
    console.log(`[mcskins/default] loading default skin, didn't find skin for ${settings.u}`)
    
    loadDefaultSkin()
    .then(texture => {
      drawSkin(texture, settings)
    })
  })
}

const drawSkin = (image, settings) => {
  console.log('[mcskins/render] drawing skin...')

  const faceSize = settings.getSize()
  const canvas = settings.isSkin ? new Canvas.Canvas(image.width, image.height) : new Canvas.Canvas(faceSize, faceSize)
  const context = canvas.getContext('2d')
  
  context.patternQuality = 'nearest'
  context.antialias = 'none'
  
  try {
    if (!settings.isSkin) {
      context.drawImage(image, 8, 8, 8, 8, 0, 0, faceSize, faceSize)
      context.drawImage(image, 40, 8, 8, 8, 0, 0, faceSize, faceSize)  
    } else {
      context.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height)
    }
    
    return canvas.toBuffer((e, buf) => renderOut(buf, settings.res))
  } catch (e) {
    console.log('[mcskins/error] caught an error, writing default skin')
    console.error(e)
    
    loadDefaultSkin()
    .then(texture => {
      drawSkin(texture, settings)
    })
  }
}

const renderOut = (buffer, res) => {
  console.log('[mcskins/render] rendering...')
  res.type('png')
  res.end(buffer, 'binary')
  console.log('[mcskins/render] done')
}

app.get('/', (req, res) => {
  if (req.query
      && Object.keys(req.query).length === 0
      && Object.getPrototypeOf(req.query) === Object.prototype) {
    res.sendStatus(418)
  } else {
    const settings = {
      u: req.query.u,
      isSkin: req.query.skin === undefined ? false : true,
      skinURL: 'http://skinsystem.ely.by/skins/',
      getSize: () => {
        if (parseInt(req.query.size) < minSize) {
          return minSize
        } else if (parseInt(req.query.size) > maxSize) {
          return maxSize
        }
        
        return parseInt(req.query.size) || 256
      },
      res: res
    }
    
    console.log(`[mcskins/request] request for ${settings.u}`)
    render(settings)
  }
})

app.listen()