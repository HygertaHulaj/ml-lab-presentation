# Explore after the lecture

All links assume the app is running (see `START_HERE.md`); replace `localhost:8080` with `localhost:5173` for a local start.

| What | Link | Try this |
|---|---|---|
| The whole lecture | http://localhost:8080/presentation | press I for the index; every step has its own address |
| Recent research | http://localhost:8080/presentation/research | Kruschel et al. (2025): do interpretable models really lose accuracy? |
| K-Means on Iris, 3D | http://localhost:8080/lessons/kmeans-iris | Explore (2): change K and the seed; why do the clusters differ from the species? |
| Movies, 3D regression | http://localhost:8080/lessons/shah-8-4-movies | Explore: raise the learning rate until the cost grows |
| Restaurants, Airlines and Rock, 3D | `/lessons/shah-8-1-restaurants`, `/lessons/shah-8-2-airlines`, `/lessons/shah-8-3-rock` | Restaurants: a first plane (15 restaurants, the book's data). Rock: read the residual plot; would log(permeability) help? |
| Chapter activities | http://localhost:8080/activities | DS4A Applying the Concepts 1–8 and Shah 8.1–8.4: Story, Try it, Solution |

The classic lab, the standalone film page and the movie workshop are hidden for the lecture (not deleted): set
`SHOW_EXTRA_PAGES = true` in `frontend/src/features.ts` and rebuild to bring them back.
