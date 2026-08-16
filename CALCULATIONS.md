# Rating & Performance Calculation Engine

This document provides a clear, step-by-step breakdown of the formulas, algorithms, and models used by **Codeforces-Vcon** to calculate simulated ranks, projected rating changes ($\Delta$), and pure performance ratings.

---

## 1. Simulated Live Rank Determination

When you complete a virtual contest, your total points and penalties are calculated from your submission timestamps:

### A. Codeforces Scoring (CF Rules)
For problems with initial point value $M$:

$$\text{Problem Points} = \max\left(0.3 \times M,\; M - \frac{M}{250} \times T_{\text{minutes}} - 50 \times W\right)$$

* $T_{\text{minutes}}$: Minutes elapsed from contest start to your Accepted (`OK`) submission.
* $W$: Number of incorrect attempts prior to Accepted.

### B. ICPC Scoring

$$\text{Total Penalty} = \sum_{\text{solved problems}} \left(T_{\text{minutes}} + 10 \times W\right)$$

### C. Live Standings Placement
Your final rank is determined by comparing your total points and penalty against every official live contestant:
* A contestant ranks **ahead of you** if:
  1. They have **more points** than you, **OR**
  2. They have the **same points**, but with a **lower penalty** than you.

$$\text{Simulated Rank} = 1 + \text{Count of official contestants who beat your score}$$

---

## 2. Expected Rank Model ($\text{Seed}$)

The expected performance of any rating is based on the **Elo / Bradley-Terry win-probability model**.

### A. Win Probability
The probability that contestant $A$ (rating $R_A$) beats contestant $B$ (rating $R_B$) is:

$$P(A > B) = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$

* If both contestants have equal ratings ($R_A = R_B$), $P = 0.50$ (50% chance).
* If $R_A$ is 400 points higher than $R_B$, $P \approx 0.91$ (91% chance to win).

### B. Expected Rank ($\text{Seed}$)
The **$\text{Seed}$** of rating $R$ is the expected rank a contestant with that rating would achieve against the entire field of $N$ participants:

$$\text{Seed}(R) = 1 + \sum_{i=1}^{N} P(\text{Contestant}_i > R) = 1 + \sum_{i=1}^{N} \frac{1}{1 + 10^{(R - R_i) / 400}}$$

* Higher hypothetical rating $R \implies$ lower expected rank number (closer to 1st place).

---

## 3. Performance Rating ($R_{\text{perf}}$)

### What is Performance Rating?
While your official rating changes gradually over time, your **Performance Rating** measures your **pure skill output in a single contest**. It answers the question:
> *"What rating should you have such that your expected rank against this specific contest field matches your actual achieved rank?"*

$$\text{Seed}(R_{\text{perf}}) = \text{Actual Rank}$$

### How It Is Calculated (Binary Search)
Since $\text{Seed}(R)$ strictly decreases as rating $R$ increases, the engine finds $R_{\text{perf}}$ rapidly using binary search over the rating range $[-500, 6000]$:

```text
Low = -500, High = 6000
While (High - Low > 1):
    Mid = (Low + High) / 2
    If Seed(Mid) > Actual_Rank:
        Low = Mid   // Rating is too low (expected rank is too high)
    Else:
        High = Mid  // Rating is high enough
Return Low
```

---

## 4. Projected Rating Delta ($\Delta$)

The projected rating change simulates the official Codeforces rating update procedure in 4 steps:

### Step 1: Geometric Mean Target Rank
Using the user's initial rating $R_{\text{init}}$ before the contest, compute their expected rank $S_{\text{init}} = \text{Seed}(R_{\text{init}})$. The target geometric midpoint rank $m$ is:

$$m = \sqrt{\text{Actual Rank} \times S_{\text{init}}}$$

### Step 2: Target Rating
Find the target rating $R_{\text{target}}$ corresponding to rank $m$:

$$\text{Seed}(R_{\text{target}}) = m$$

### Step 3: Raw Delta

$$\Delta_{\text{raw}} = \frac{R_{\text{target}} - R_{\text{init}}}{2}$$

### Step 4: Multi-Tier Contest Adjustments
To ensure rating conservation across the entire contest:

1. **Global Contest Deflation Adjustment ($adj_1$):**

   $$adj_1 = \min\left(0, \max\left(-10, -\frac{\sum \Delta_{\text{raw}}}{N}\right)\right)$$

2. **Top-Tier Zero-Sum Balance ($adj_2$):**
   Balances the rating shift for top performers ($k = \min(100, \text{round}(\sqrt{N}))$):

   $$adj_2 = -\frac{\sum_{i=1}^{k} (\Delta_{\text{raw}, i} + adj_1)}{k}$$

3. **Final Projected Delta:**

   $$\Delta = \Delta_{\text{raw}} + adj_1 + \left(adj_2 \times \max\left(0, 1 - \frac{\text{Actual Rank}}{k}\right)\right)$$

---

## 5. Recent Form vs. Historical Baseline

To provide immediate visibility into recent momentum:

### A. Historical Baseline (All-Time Average)
The mean performance rating across all your recorded virtual and unrated contests:

$$\overline{R}_{\text{all-time}} = \frac{1}{N} \sum_{i=1}^{N} R_{\text{perf}, i}$$

### B. Recent Form (Last 5 Contests Average)
The mean performance rating across your 5 most recent contests:

$$\overline{R}_{\text{last 5}} = \frac{1}{5} \sum_{i=1}^{5} R_{\text{perf}, i}$$

### C. Trend Difference

$$\text{Trend Difference} = \overline{R}_{\text{last 5}} - \overline{R}_{\text{all-time}}$$

* **`↗ +X` (Green):** You are actively outperforming your long-term baseline (positive momentum).
* **`↘ -X` (Red):** You are performing below your historical baseline.

---

## Summary of Terms

| Term | Meaning |
|---|---|
| **Simulated Rank** | Your placing if your virtual score were slotted directly into the live contest leaderboard. |
| **Performance Rating** | The pure rating level of your performance in that round (where $\Delta = 0$). |
| **Rating Delta ($\Delta$)** | The projected rating change ($+ / -$) you would have earned had the round been official. |
| **Historical Baseline** | Your all-time average performance rating across all completed virtual contests. |
| **Last 5 Avg. Perf** | Your recent average performance rating, reflecting your current form today. |
