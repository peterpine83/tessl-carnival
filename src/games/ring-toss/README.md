# Ring Toss

Land rings on the bottle necks before you run out of rings.

## How to play

- A grid of bottles stands at the back of the booth, in three rows of five.
- Move the mouse to aim: the crosshair shows where the ring will land. Your arm
  sways, so the crosshair drifts up to 40 px left and right.
- Click to throw a ring. You throw one at a time: the next waits until the last
  one lands.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck. Bottles further
back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `sway`, `bottleAt`)
  and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
