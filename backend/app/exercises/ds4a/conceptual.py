"""DS4A Chapter 8 'Applying the Concepts' — conceptual activities (AC1, AC2, AC4, AC5).

These are answered with explicit, rule-based reasoning tied to the book's definitions.
No model is trained to "decide" these answers.
"""
from ..base import Exercise, Question, SimilarProblem

DS4A = "Data Science for All (Davis & Glanz)"

# ---------------------------------------------------------------- AC1
_AC1_ITEMS = [
    ("a", "Computer keyboard", False, "Converts key presses to characters with fixed rules; it does not learn from data."),
    ("b", "Spam caller labeling on your cell phone", True, "Learns patterns from call data and user reports to label likely spam callers (classification)."),
    ("c", "Talk-to-text on your cell phones", True, "Speech recognition is a learned model (today: deep learning) mapping audio to words."),
    ("d", "Stopwatch", False, "Counts time with a fixed mechanism; no learning or human-like task."),
    ("e", "Amazon Echo Dot", True, "Voice assistant: speech recognition and language understanding are AI/deep-learning systems."),
    ("f", "Text suggestions in your email", True, "Predictive text models learn from large text corpora which words are likely next."),
    ("g", "Headphones", False, "Play audio; in most cases they perform no task that mimics human intelligence."),
    ("h", "E-scooters", False, "Electric motor and controls follow fixed rules; in most cases no learning from data."),
]

AC1 = Exercise(
    id="ds4a-ac1", book="DS4A", chapter=8, exercise_number="AC 1",
    title="Identify Artificial Intelligence", category="AI concepts", source_page="p. 398",
    kind="conceptual",
    description="Identify which of the following utilizes artificial intelligence in most cases: "
                + "; ".join(f"{k}. {n}" for k, n, _, _ in _AC1_ITEMS) + ".",
    required_dataset=None,
    concepts=["artificial intelligence", "machine learning"],
    understand=("DS4A defines AI as computer systems performing tasks that generally require or mimic human "
                "intelligence, and ML as the subfield where systems improve at a task by learning from data. "
                "Test for each item: does it perform a human-like task (recognising speech, judging spam, "
                "predicting text) and does it rely on patterns learned from data? Fixed-rule devices are not AI."),
    questions=[Question(f"1{k}", n, "AI" if ai else "Not AI", why) for k, n, ai, why in _AC1_ITEMS],
    interpretation="Answer: b, c, e and f use AI in most cases. a, d, g and h follow fixed, explicitly programmed rules.",
    common_mistakes=["Treating anything electronic or 'smart-looking' as AI.",
                     "Forgetting that 'in most cases' matters: some premium headphones or scooters may include AI features, but the typical device does not."],
    python_code="",
    similar=[
        SimilarProblem("Does a basic pocket calculator use AI?", "No",
                       "It applies fixed arithmetic rules; nothing is learned from data. (DS4A's in-chapter TiY lists calculators as well.)"),
        SimilarProblem("Does Netflix's 'Because you watched...' row use AI?", "Yes",
                       "Recommendations are learned from viewing data of many users (collaborative filtering, HoIDS §8.2)."),
        SimilarProblem("Does a thermostat with a fixed schedule use AI?", "No",
                       "A fixed schedule is explicitly programmed. A thermostat that learns your habits would be ML."),
    ],
)

# ---------------------------------------------------------------- AC2
S1, S2, S3 = "Step 1: Ingesting Data", "Step 2: Analyzing the Data", "Step 3: Producing Model-Based Results"
_AC2_ITEMS = [
    ("1", "Alerts and Recommendations: if a period of lower activity is predicted, the app sends a notification with tailored strategies for exercising.", S3,
     "The model's output is delivered to the user as an action (a notification) — a model-based result."),
    ("2", "Calendar Data: the app syncs with the athlete's game, training, and personal calendar.", S1,
     "Collecting data into the system."),
    ("3", "Eating Habits: online journal tools or third-party apps track food and drink.", S1,
     "Collecting data into the system."),
    ("4", "Feedback Loop: continuously learns from the effectiveness of implemented actions and user feedback, refining its recommendations.", S2,
     "Learning/refitting the model from outcomes is analysis. (The feedback itself is new data entering Step 1, and the refined recommendations appear in Step 3 — mention this cycle when presenting.)"),
    ("5", "Pattern Recognition: identifies recurring behaviors or triggers that lead to following the plans less closely.", S2,
     "Finding patterns in the ingested data is the analysis step."),
    ("6", "Physical Activity Monitoring: with consent, scans the personal calendar and wearable data for activity.", S1,
     "Collecting data into the system."),
    ("7", "Resource Allocation: suggests rescheduling activities, allocating time to exercises, or prioritizing foods.", S3,
     "An actionable suggestion produced from the model's predictions."),
    ("8", "User Input: optional daily or weekly emotional self-check surveys.", S1,
     "Collecting self-reported data."),
    ("9", "Muscle Level Prediction: ML algorithms analyze the ingested data to predict muscle levels.", S2,
     "The text says the algorithms 'analyze the ingested data' — fitting/applying the model. The prediction is then used by items 1 and 7 (Step 3)."),
]

AC2 = Exercise(
    id="ds4a-ac2", book="DS4A", chapter=8, exercise_number="AC 2",
    title="Identify Data Ingestion, Data Analysis, and Results", category="ML process",
    source_page="p. 398", kind="conceptual",
    description="A 'Physical Fitness Assistant' integrates athletes' calendars, eating habits, physical activity and "
                "self-reported emotional state. Classify each item as Step 1 (Ingesting Data), Step 2 (Analyzing the "
                "Data) or Step 3 (Producing Model-Based Results).",
    required_dataset=None,
    concepts=["data ingestion", "data analysis", "model-based results", "ML process"],
    understand=("DS4A §8.2 breaks ML into three steps. Step 1 feeds structured or unstructured data into the system. "
                "Step 2 fits a model relating variables, behind the scenes. Step 3 applies the model and delivers results "
                "(emails, dashboards, automatic actions). Ask of each item: is it collecting data, learning/finding "
                "patterns, or acting on the output?"),
    questions=[Question(k, t, s, w) for k, t, s, w in _AC2_ITEMS],
    interpretation="Step 1: items 2, 3, 6, 8. Step 2: items 4, 5, 9. Step 3: items 1, 7. The mirror TiY in §8.2 (Mental Wellness Assistant) follows the same logic.",
    common_mistakes=["Labelling 'prediction' items as Step 3 just because they mention prediction: computing the prediction is analysis; *acting on it* is a result.",
                     "Forgetting that the feedback loop connects all three steps."],
    python_code="",
    similar=[
        SimilarProblem("Smart irrigation app: 'Soil-moisture sensors upload readings every hour.'", S1, "Data collection."),
        SimilarProblem("Smart irrigation app: 'A model estimates tomorrow's water need from weather and moisture.'", S2, "Model analysis of ingested data."),
        SimilarProblem("Smart irrigation app: 'The valves open automatically for the computed duration.'", S3, "Automated action based on the model output."),
    ],
)

# ---------------------------------------------------------------- AC4
_AC4 = [
    ("1", "Recognizing an image of an animal as a dog or a cat.", "Classification", "Response is a category (dog/cat)."),
    ("2", "Predicting the age of a car.", "Regression", "Age is a numeric quantity. (Review Q20 asks why a classification model can't predict a car's age.)"),
    ("3", "Predicting wine quality on a 1-10 scale.", "Regression",
     "The score is numeric and ordered, so regression is the natural fit (predictions like 6.4 can be rounded). Because it takes only 10 ordered integer values, it can also be framed as (ordinal) classification — mention both and justify the choice."),
    ("4", "Predicting whether a person is susceptible to lung cancer.", "Classification", "Yes/no outcome — categorical."),
    ("5", "Predicting whether an SMS text is spam or not.", "Classification", "Spam / not spam — categorical."),
    ("6", "Predicting the energy use of appliances in a low-energy building.", "Regression", "Energy use (e.g. Wh) is quantitative."),
]
AC4 = Exercise(
    id="ds4a-ac4", book="DS4A", chapter=8, exercise_number="AC 4",
    title="Regression versus Classification", category="Supervised learning types",
    source_page="p. 399", kind="conceptual",
    description="For each response variable, identify whether a regression or a classification approach is more appropriate.",
    required_dataset=None,
    concepts=["regression", "classification", "quantitative vs categorical response"],
    understand="DS4A §8.3: regression predicts a quantitative response; classification predicts a categorical response. Only the TYPE OF THE RESPONSE decides — not the explanatory variables.",
    questions=[Question(k, p, a, e) for k, p, a, e in _AC4],
    interpretation="Classification: 1, 4, 5. Regression: 2, 3 (see note), 6.",
    common_mistakes=["Deciding by the type of the inputs (an image is not 'categorical' — the label is).",
                     "Calling every number 'regression': a number used as a code (e.g. postcode) is categorical."],
    python_code="",
    similar=[
        SimilarProblem("Predicting tomorrow's maximum temperature (°C).", "Regression", "Quantitative response."),
        SimilarProblem("Predicting which of 5 blood types a patient has.", "Classification", "Categorical response with 5 classes (multiclass)."),
        SimilarProblem("Predicting the number of goals in a football match.", "Regression", "A count is quantitative (count-regression models exist; linear regression is a first approximation)."),
    ],
)

# ---------------------------------------------------------------- AC5
AC5 = Exercise(
    id="ds4a-ac5", book="DS4A", chapter=8, exercise_number="AC 5",
    title="Inference versus Prediction", category="Modeling goals", source_page="p. 399",
    kind="conceptual",
    description="For each scenario, state whether it is a classification or regression problem, whether the response is "
                "quantitative or categorical, and whether the main interest is inference, prediction, or both.",
    required_dataset=None,
    concepts=["inference", "prediction", "regression", "classification"],
    understand=("DS4A §8.3: prediction = accurately predicting the response is the top priority; inference = "
                "identifying and describing relationships between explanatory and response variables. Look for "
                "phrases like 'which factors are associated' (inference) versus 'predict who/which' (prediction)."),
    questions=[
        Question("1", "Top 100 IMDB movies: rank, duration, genre, year, cast; which variables are associated with a higher rank?",
                 {"problem": "regression", "response_type": "quantitative", "goal": "inference"},
                 "Rank is treated as a number (1-100) and the goal is to understand associations ('which variables are associated')."),
        Question("2", "Presidential election: predict who will win, and learn which characteristics and issues mattered.",
                 {"problem": "classification", "response_type": "categorical", "goal": "both"},
                 "Elected (yes/no) is categorical; the text explicitly wants both the prediction and the important characteristics."),
        Question("3", "California fires: historical fire, weather, planning and tourism data to predict areas at risk.",
                 {"problem": "classification", "response_type": "categorical", "goal": "prediction"},
                 "At risk / not at risk is categorical, and the purpose is to allocate resources to the predicted areas."),
    ],
    interpretation="1: regression / quantitative / inference. 2: classification / categorical / both. 3: classification / categorical / prediction.",
    common_mistakes=["Assuming a rank is categorical: it is ordinal; the book treats it as quantitative here.",
                     "Choosing only 'prediction' for Q2 although the scenario states two goals."],
    python_code="",
    similar=[
        SimilarProblem("A bank wants to know which customer attributes are linked to higher credit-card spending.",
                       "Regression; quantitative; inference", "Spending is numeric; the aim is understanding relationships."),
        SimilarProblem("An email provider wants to automatically move phishing emails to a separate folder.",
                       "Classification; categorical; prediction", "Accuracy of the label matters most; interpretability is secondary."),
    ],
)

EXERCISES = [AC1, AC2, AC4, AC5]
