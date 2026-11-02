# Whack-a-Mole

Whack the moles as they pop out of the nine holes, before they duck back down.

## How to play

- Moles pop up one at a time from a 3 by 3 grid of holes, then drop back down.
- Click a mole while it's up to whack it.
- As the round goes on, moles pop up more often and stay up for less time:
  a new mole every 1 second at the start, every 0.35 seconds at the end, and
  each one stays up for 1.3 seconds at the start, 0.6 seconds at the end.
- The round lasts 30 seconds. Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Missing a mole, or clicking an empty hole,
costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `whack`, `step`, `spawnGap`, `upTime`)
  and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
