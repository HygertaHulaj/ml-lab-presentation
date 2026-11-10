# Movies classroom journey

Open `/activities` and select **Can money buy a better movie rating?**, or open `/workshops/movies` directly.
Source: Shah, *Hands-On Introduction to Data Science*, Hands-On Problem 8.4, p. 233.

1. **Story.** Read the three movie cards beside the scatter plot. Ask whether a bigger budget guarantees a higher rating. The examples are selected by budget percentile, not by how well they support an argument.
2. **Predict.** Ask the audience whether adding social-media reactions will make a large or small improvement. Select their prediction; it will reappear beside the evidence.
3. **Watch.** The example begins with the budget-only line. Use the three moment buttons to inspect errors, reveal the cost bowl, and reach gradient descent. Press Space to play or pause. Explain that one orange marker represents one whole cyan line; lower cost means smaller squared errors. Playback pauses at the interpretation scene.
4. **Try.** Ask whether bigger steps will still be stable. Test α = 0.1 against α = 2.2, both from zero with an 80-update limit and the same observations. The chart uses shared iteration and log-cost axes. Either run can be opened in the same 3D scene, with its recorded parameters and costs.
5. **Solution.** Revisit the prediction. Compare budget alone, budget plus followers, and the expanded social-media model on identical complete observations. These are least-squares reference fits, separate from the experimental 80-update runs. Return to an individual movie’s observed rating and recorded fitted prediction. Emphasize that optimization, explanatory fit, and performance on unseen data are different questions.

Use **Add a predictor** to show the movie regression plane. Continue to **Airlines** for another line-to-plane example, or **Rock Samples** for the advanced question of visualizing a three-predictor model as a slice. The original Story/Try/Solution activity remains linked from the conclusion.

Outside the 3D scene, arrow keys move through the journey. Inside it, arrow keys move through cinematic scenes. F toggles full screen; L switches the classroom page between dark and light themes. The 3D scene retains the existing lesson appearance, subtitles, reduced-motion behavior, Explore controls, and Math mode.

All observations, fitted predictions, coefficients, model statistics, and experiment results come from the backend. The frontend only selects examples and maps recorded values to visual coordinates. The bowl compresses heights and clips out-of-range divergent positions; its numerical cost panel remains authoritative.
