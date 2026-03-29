# How to Launch the Application

## 1. Clone the Repository
Run the following command:

```bash
git clone https://github.com/uts2-XingyuZhong/food_tracking_app.git
```

## 2. Set Up the Database
- Open pgAdmin.
- Create a database named `food_tracking_app`.
- Import the two CSV files located in the `database` folder.
- Create the following two tables:
  - `added_ingredients`
  - `ingredients_list`

## 3. Install Dependencies
Run the following command:

```bash
npm install
```

## 4. Obtain an API Key
Visit the following URL and get your API key:

https://spoonacular.com/food-api

## 5. Create an Environment File
Create a `.env` file and add the following content:

```env
PGPASSWORD="yourPGAdminPassward"
SPOONACULAR_API_KEY="yourAPIKey"
```

## 6. Run the Application
Execute the following command:

```bash
node index.js
```
## 7. Access the Application
Open your browser and go to:

http://localhost:3000