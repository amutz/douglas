# Douglas

A small browser game about a boy called Douglas getting to school in the
morning. You wake him up, walk him out of the house past his family, catch
the school bus, ride it across town, and find your seat in class -- and
then the pop quiz happens, and the morning stops going to plan.

The view is angled and looking down on everything, a bit like Sneaky
Sasquatch.

## Playing it

Open `index.html` in a web browser. That's it -- no installing, no build
step, no server.

- **Move:** `W A S D` or the arrow keys
- **Do something:** `E` (or space). A white button pops up when Douglas is
  somewhere he can do something.
- **On a phone:** drag your thumb on the left half of the screen to walk,
  and tap the button when it appears.

## The parts of the game

1. **The house** -- Douglas is asleep. Get him up, then find the front door.
   His mum, dad and brother are wandering around and will say hello.
2. **The front yard** -- walk down the path to the street. The school bus
   pulls up after a few seconds.
3. **The bus ride** -- a short cutscene. Press `E` to skip it.
4. **Outside school** -- walk up to the front doors and go inside.
5. **The hallway** -- follow the glowing path to the classroom door.
6. **The classroom** -- find the one empty desk and sit down.
7. **The pop quiz** -- the teacher announces a quiz, then turns into a
   monster. Follow the red path back out of the school.
8. **The taxi** -- a taxi pulls up outside. Jump in.
9. **The desert** -- it turns out the taxi was not going to Douglas's
   house either.

## What's in each file

| File | What it does |
| --- | --- |
| `index.html` | The page. Loads the other files. |
| `style.css` | How the text, buttons and title screen look. |
| `draw.js` | Turns world positions into points on the screen, and draws boxes, roofs, trees and speech bubbles at the right angle. |
| `people.js` | Douglas and the other characters: how they look and how they walk. |
| `world.js` | Building a place: floors, walls, things you bump into, the bus, cars, houses. |
| `scenes.js` | The four places above, and what happens in each. |
| `game.js` | Keyboard and touch controls, the camera, and the loop that draws every frame. |

## Handy while making changes

Adding a `#` and a place name to the web address starts the game there, so
you don't have to replay from the beginning:

- `index.html#house`
- `index.html#yard`
- `index.html#busride`
- `index.html#school`
- `index.html#hallway`
- `index.html#classroom`
- `index.html#taxiride`
- `index.html#desert`

## Adding to the game

Most things in the world are boxes. To put something new in a room, add a
line like this in `scenes.js`:

```js
addBlock(W, { x: 200, y: 400, w: 60, d: 40, h: 50, color: '#b07a4a' });
```

`x` and `y` are where it sits on the floor, `w` and `d` are how wide and
deep it is, `h` is how tall, and `color` is any normal hex colour. Add
`solid: false` if you want to be able to walk through it.
