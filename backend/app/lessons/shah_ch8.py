"""Lesson manifests: Shah (HoIDS) Chapter 8 Hands-On Problems 8.1–8.4 as cinematic lessons (pp. 231–233).
Problem 8.1 uses the book's OA 8.3 ratings.tsv.

Each lesson has one or two *parts*; a part is one model run through `POST /simulations/linreg-gd`:
- kind "plane": two shown predictors, the points stand in 3D and the regression plane tilts into place frame by frame;
- kind "line": one predictor, the line swings into place while a ball rolls down the real cost surface J(θ0, θ1).
Narration strings contain placeholders that the frontend fills from that part's trace ({n}, {r2}, {iters}, {lr}, ...);
manifests never hard-code computed results.
"""

CONTROLS = {"learning_rate": {"min": 0.01, "max": 2.5, "step": 0.01}, "iterations": {"min": 1, "max": 5000, "step": 1}}
MATH = {
    "model": "h(x) = θ₀·zᵢ₀ + θ₁z₁ + … + θₙzₙ,  zᵢ₀ = 1,  zⱼ = (xⱼ − μⱼ) / σⱼ",
    "cost": "J(θ) = (1/2m) Σᵢ (h(xᵢ) − yᵢ)²",
    "update": "θⱼ := θⱼ − α · (1/m) Σᵢ (h(xᵢ) − yᵢ) · zᵢⱼ  for j = 0…n, all at once (Shah eq. 8.7); with zᵢ₀ = 1 the intercept step is θ₀ := θ₀ − α · mean(prediction − actual)",
    "back": "slope in original units = θⱼ / σⱼ;  intercept = θ₀ − Σ θⱼ μⱼ / σⱼ",
}

PLANE_SCENES = [
    {"id": "rise", "title": "{title_part}", "narration": [
        "Each point is one {unit}: {x1} along the floor, {x2} into the depth, {response} upwards.",
        "{n} {units} stand in the space. Is there a flat surface, a plane, that passes close to all of them?"]},
    {"id": "guess", "title": "A first guess", "narration": [
        "Gradient descent starts from nothing: every θ is zero, so the plane predicts 0 for every {unit}.",
        "The cost J measures how wrong it is: half the average squared error, {j0}."]},
    {"id": "descend", "title": "Downhill", "narration": [
        "Each iteration moves every θ a small step against its gradient, with learning rate α = {lr}.",
        "The observations stay fixed. Updating the intercept lifts the plane; updating the slopes changes its tilt. A suitable learning rate reduces the cost.",
        "{held_sentence}"]},
    {"id": "converged", "title": "{outcome_title}", "narration": [
        "{stop_sentence}",
        "{reference_sentence}"]},
    {"id": "read", "title": "Reading the plane", "narration": [
        "{response} = {b0} {b1_term} {b2_term}.",
        "The least-squares reference has R² = {r2}: it accounts for {r2pct} of the observed variation in {response}, on these data."]},
]
LINE_SCENES = [
    {"id": "rise", "title": "{title_part}", "narration": [
        "Each point is one {unit}: {x1} across, {response} upwards. {n} {units}.",
        "We want the straight line that predicts {response} from {x1} best."]},
    {"id": "guess", "title": "A first guess", "narration": [
        "Gradient descent starts with θ₀ = θ₁ = 0: a flat line at zero."]},
    {"id": "residuals", "title": "How wrong?", "narration": [
        "Each vertical line is an error, a residual: the actual {response} minus the prediction.",
        "Square them, average, halve: that is the cost J = {j0}."]},
    {"id": "bowl", "title": "The cost landscape", "narration": [
        "Every possible line is a point on this surface: θ₀ and θ₁ on the floor, the cost J as the height.",
        "The least-squares line sits at the lowest point of the bowl. We start high up on its rim.",
        "Careful: the slope of the line (in the data) is one thing; the gradient of the cost (on the bowl) is another, the direction in which J rises fastest."]},
    {"id": "descend", "title": "Rolling downhill", "narration": [
        "Each iteration takes one step downhill, against the gradient, with learning rate α = {lr}.",
        "On the left the line swings into place; on the right the ball rolls down the bowl, along the real path."]},
    {"id": "converged", "title": "{outcome_title}", "narration": [
        "{stop_sentence}",
        "{reference_sentence}"]},
    {"id": "read", "title": "Reading the line: intercept and slope", "narration": [
        "{response} = {b0} {b1_term}.",
        "The least-squares reference has R² = {r2}: it accounts for {r2pct} of the observed variation in {response}, on these data."]},
]

LESSONS = [
    {
        "id": "shah-8-1-restaurants", "version": 2, "algorithm": "linreg_gd", "book": "HoIDS", "problem": "Hands-On Problem 8.1",
        "source_page": "p. 231", "exercise_id": "hoids-hop8-1",
        "title": "Restaurant ratings: a first regression plane",
        "summary": "15 restaurants rise into 3D by their food and service ratings, and a plane learns their overall rating.",
        "objectives": ["Write a multiple regression in mathematical form.", "See least squares as the plane with the smallest squared errors.",
                       "Read each coefficient as a change in the overall rating, holding the other ratings fixed.",
                       "Keep association and causation apart."],
        "intro": {"title": "Restaurant ratings", "narration": [
            "Fifteen restaurants, each with the average ratings previous customers gave for food, ambience and service, and an overall rating.",
            "Shah's Problem 8.1: how do food, ambience and service go with a restaurant's overall rating?"]},
        "parts": [
            {"id": "m", "kind": "plane", "title": "Overall rating from food, service and ambience", "unit": "restaurant", "units": "restaurants",
             "axes": {"x1": "food rating", "x2": "service rating", "y": "overall rating"},
             "config": {"dataset": "restaurant_ratings", "predictors": ["food", "service", "ambience"], "response": "rating",
                        "shown": ["food", "service"], "learning_rate": 0.1, "iterations": 5000,
                        "compare": [{"label": "food + service", "predictors": ["food", "service"]},
                                    {"label": "+ ambience", "predictors": ["food", "service", "ambience"]}]},
             "scenes": PLANE_SCENES,
             "after": {"id": "models", "title": "Does ambience add anything?", "narration": [
                 "Compare food and service alone with all three ratings: {models_sentence}",
                 "With only fifteen restaurants, adjusted R² matters: it penalises the extra predictor."]}},
        ],
        "outro": {"title": "What the restaurants say", "narration": [
            "Food and service ratings go with the overall rating: the model accounts for {r2pct} of its variation, on these restaurants.",
            "Fifteen restaurants are few, and the ratings come from the same customers. It is an association, not a cause."]},
        "math": MATH, "controls": CONTROLS,
    },
    {
        "id": "shah-8-2-airlines", "version": 2, "algorithm": "linreg_gd", "book": "HoIDS", "problem": "Hands-On Problem 8.2",
        "source_page": "p. 232", "exercise_id": "hoids-hop8-2",
        "title": "Airline Costs: a regression plane and a line",
        "summary": "Watch 31 airlines of the 1950s rise into 3D, and the regression plane find them; then a line from customers to assets.",
        "objectives": ["Read a multiple regression as a plane through points in 3D.", "See gradient descent reach the least-squares fit.",
                       "Interpret coefficients, R² and which predictor matters.", "Tell association from causation."],
        "intro": {"title": "Airline Costs", "narration": [
            "Thirty-one US airlines in the early 1950s (Proctor and Duncan, 1954).",
            "Shah's Problem 8.2: predict how many customers an airline serves, then how large its assets are."]},
        "parts": [
            {"id": "m1", "kind": "plane", "title": "Model 1: customers from flight length and daily flight time",
             "unit": "airline", "units": "airlines",
             "axes": {"x1": "flight length (miles)", "x2": "daily flight time (h)", "y": "customers (1000s)"},
             "config": {"dataset": "airline_costs", "predictors": ["flight_length_miles", "daily_flight_time_hours"],
                        "response": "customers_served_1000s", "learning_rate": 0.1, "iterations": 5000, "label_column": "airline"},
             "scenes": PLANE_SCENES},
            {"id": "m2", "kind": "line", "title": "Model 2: total assets from customers",
             "unit": "airline", "units": "airlines",
             "axes": {"x1": "customers (1000s)", "y": "total assets ($100,000s)"},
             "config": {"dataset": "airline_costs", "predictors": ["customers_served_1000s"], "response": "total_assets_100k",
                        "learning_rate": 0.1, "iterations": 5000, "label_column": "airline"},
             "scenes": LINE_SCENES},
        ],
        "outro": {"title": "What the two models say", "narration": [
            "Longer flights go with more customers; daily flight time adds little once length is known.",
            "More customers go with more assets: size goes with size. These are associations among 31 airlines, not causes."]},
        "math": MATH, "controls": CONTROLS,
    },
    {
        "id": "shah-8-3-rock", "version": 2, "algorithm": "linreg_gd", "book": "HoIDS", "problem": "Hands-On Problem 8.3",
        "source_page": "p. 232", "exercise_id": "hoids-hop8-3",
        "title": "Rock samples: gradient descent in four dimensions",
        "summary": "Watch 48 petroleum rock samples and a regression plane on three pore measurements find its way downhill.",
        "objectives": ["Run gradient descent with three predictors at once (Shah eq. 8.7).", "Understand why features are standardized.",
                       "See the descent reach the least-squares coefficients.",
                       "Check linearity with a residual-versus-fitted plot, not with R² alone."],
        "intro": {"title": "Rock samples", "narration": [
            "Forty-eight rock samples from a petroleum reservoir, measured by image analysis (BP Research).",
            "Shah's Problem 8.3: is permeability linearly related to the pores' area, perimeter and shape? Then find the model by gradient descent."]},
        "parts": [
            {"id": "m", "kind": "plane", "title": "perm from area, perimeter and shape", "unit": "sample", "units": "samples",
             "axes": {"x1": "perimeter (pixels)", "x2": "area (pixels)", "y": "permeability (mD)"},
             "config": {"dataset": "rock", "predictors": ["area", "peri", "shape"], "response": "perm", "shown": ["peri", "area"],
                        "learning_rate": 0.1, "iterations": 5000},
             "scenes": PLANE_SCENES},
        ],
        "outro": {"title": "Partly linear", "narration": [
            "The least-squares model accounts for {r2pct} of the observed variation in permeability. The remaining variation is unexplained by this fit.",
            "{diagnostic_sentence}",
            "Permeability is very skewed, from 6 to 1300. Transforming it, for example log(permeability), is an option to test, not a conclusion."]},
        "math": MATH, "controls": CONTROLS,
    },
    {
        "id": "shah-8-4-movies", "version": 2, "algorithm": "linreg_gd", "book": "HoIDS", "problem": "Hands-On Problem 8.4",
        "source_page": "p. 233", "exercise_id": "hoids-hop8-4",
        "title": "Movies and social media: rolling down the cost bowl",
        "summary": "Do budgets and followers predict how a movie is rated? Watch the plane, then a ball rolling down the real cost surface.",
        "objectives": ["Compare models with R² and adjusted R² on the same observations.", "Choose a single predictor with a stated criterion.",
                       "Picture the cost surface J(θ₀, θ₁) and gradient descent as rolling downhill.", "Find the least-squares intercept and slope by gradient descent."],
        "intro": {"title": "Movies, 2014–2015", "narration": [
            "Movies from 2014 and 2015, with their budgets and their reactions on social media.",
            "Shah's Problem 8.4: what predicts a movie's rating, and what does gradient descent find?"]},
        "parts": [
            {"id": "a", "kind": "plane", "title": "(a) Rating from budget and followers", "unit": "movie", "units": "movies",
             "axes": {"x1": "budget ($)", "x2": "aggregate followers", "y": "rating"},
             "config": {"dataset": "csm_movies", "predictors": ["budget", "aggregate_followers"], "response": "ratings",
                        "learning_rate": 0.1, "iterations": 5000, "label_column": "movie",
                        "rank_single": ["budget", "aggregate_followers", "likes", "dislikes", "comments"],
                        "compare": [{"label": "(a) budget + followers", "predictors": ["budget", "aggregate_followers"]},
                                    {"label": "(b) + likes, dislikes, comments", "predictors": ["budget", "aggregate_followers", "likes", "dislikes", "comments"]}]},
             "scenes": PLANE_SCENES,
             "after": {"id": "models", "title": "(b) Adding likes, dislikes and comments", "narration": [
                 "Add likes, dislikes and comments: {models_sentence}",
                 "{best_single_sentence}",
                 "Now find that predictor's line by gradient descent."]}},
            {"id": "c", "kind": "line", "title": "(c) Gradient descent on budget", "unit": "movie", "units": "movies",
             "axes": {"x1": "budget ($)", "y": "rating"},
             "config": {"dataset": "csm_movies", "predictors": ["budget"], "response": "ratings", "learning_rate": 0.1, "iterations": 5000,
                        "label_column": "movie", "complete_on": ["aggregate_followers", "likes", "dislikes", "comments"]},
             "scenes": LINE_SCENES},
        ],
        "outro": {"title": "What the movies say", "narration": [
            "Budget and social-media reactions explain only a small share of how movies are rated.",
            "Compare the final cyan fit with the gold least-squares line. {stop_sentence}"]},
        "math": MATH, "controls": CONTROLS,
    },
]
