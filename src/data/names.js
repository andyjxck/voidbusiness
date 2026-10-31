const MALE_FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
  'Benjamin', 'Samuel', 'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry',
  'Tyler', 'Aaron', 'Henry', 'Douglas', 'Peter', 'Jose', 'Adam', 'Nathan', 'Zachary', 'Walter',
  'Harold', 'Kyle', 'Carl', 'Arthur', 'Gerald', 'Roger', 'Keith', 'Jeremy', 'Lawrence', 'Terry',
  'Sean', 'Christian', 'Ethan', 'Austin', 'Joe', 'Albert', 'Jesse', 'Willie', 'Billy', 'Bryan',
  'Bruce', 'Jordan', 'Ralph', 'Roy', 'Noah', 'Dylan', 'Eugene', 'Wayne', 'Alan', 'Juan',
  'Logan', 'Randy', 'Vincent', 'Mason', 'Elijah', 'Gabriel', 'Owen', 'Caleb', 'Hunter', 'Connor',
  'Lucas', 'Miles', 'Isaac', 'Nolan', 'Cameron', 'Cole', 'Tucker', 'Tanner', 'Brady', 'Cooper',
  'Easton', 'Bryce', 'Grant', 'Reid', 'Wesley', 'Trevor', 'Travis', 'Derek', 'Marcus', 'Spencer',
  'Cody', 'Chase', 'Parker', 'Xavier', 'Dominic', 'Sebastian', 'Mateo', 'Diego', 'Antonio', 'Miguel',
  'Carlos', 'Felix', 'Oscar', 'Javier', 'Hugo', 'Marco', 'Adrian', 'Eli', 'Finn', 'Leon',
  'Omar', 'Ashton', 'Blake', 'Coleman', 'Dane', 'Elliot', 'Flynn', 'Graham', 'Harvey', 'Ian',
  'Jude', 'Kai', 'Liam', 'Milo', 'Nash', 'Orion', 'Paxton', 'Quinn', 'Rhett', 'Silas',
  'Theo', 'Ulysses', 'Victor', 'Wyatt', 'Xander', 'Yusuf', 'Zane', 'Beckham', 'Callum', 'Dario',
  'Emmett', 'Ford', 'Gunnar', 'Hayes', 'Iker', 'Jax', 'Knox', 'Lincoln', 'Maddox', 'Nico',
  'Otis', 'Pierce', 'Quincy', 'Riggs', 'Sawyer', 'Titus', 'Vance', 'Wade', 'Yale', 'Zion',
];

const FEMALE_FIRST_NAMES = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen',
  'Amy', 'Shirley', 'Angela', 'Helen', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Emma', 'Samantha',
  'Katherine', 'Christine', 'Debra', 'Rachel', 'Catherine', 'Carolyn', 'Janet', 'Ruth', 'Maria', 'Heather',
  'Diane', 'Virginia', 'Julie', 'Joyce', 'Victoria', 'Olivia', 'Kelly', 'Christina', 'Lauren', 'Joan',
  'Evelyn', 'Judith', 'Andrea', 'Hannah', 'Megan', 'Cheryl', 'Jacqueline', 'Martha', 'Gloria', 'Teresa',
  'Ann', 'Sara', 'Madison', 'Frances', 'Kathryn', 'Janice', 'Jean', 'Abigail', 'Alice', 'Julia',
  'Judy', 'Sophia', 'Grace', 'Denise', 'Amber', 'Doris', 'Marilyn', 'Danielle', 'Beverly', 'Isabella',
  'Theresa', 'Diana', 'Natalie', 'Brittany', 'Charlotte', 'Marie', 'Kayla', 'Alexis', 'Lori', 'Kaylee',
  'Ava', 'Ella', 'Tiffany', 'Crystal', 'Mia', 'Autumn', 'Rosa', 'Alyssa', 'Jasmine', 'Camila',
  'Lily', 'Zoe', 'Layla', 'Nora', 'Scarlett', 'Stella', 'Aria', 'Luna', 'Chloe', 'Violet',
  'Hazel', 'Aurora', 'Isla', 'Maya', 'Penelope', 'Riley', 'Zoey', 'Ruby', 'Eva', 'Naomi',
  'Ivy', 'Willow', 'Eliza', 'Cora', 'Daisy', 'Iris', 'Jade', 'Lila', 'Mila', 'Nadia',
  'Opal', 'Piper', 'Quinn', 'Rose', 'Sage', 'Tessa', 'Uma', 'Vera', 'Wren', 'Xena',
  'Yara', 'Zara', 'Beatrice', 'Cleo', 'Delilah', 'Esme', 'Freya', 'Gemma', 'Harper', 'Isla',
  'Juniper', 'Kira', 'Lena', 'Maeve', 'Noelle', 'Ophelia', 'Priya', 'Remy', 'Sloane', 'Talia',
  'Vivian', 'Wendy', 'Yvonne', 'Zelda', 'Astrid', 'Bianca', 'Celeste', 'Daphne', 'Ember', 'Florence',
  'Gaia', 'Holly', 'Indira', 'Juno', 'Khalia', 'Lola', 'Magnolia', 'Nia', 'Olive', 'Paloma',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Reed', 'Bailey', 'Bell', 'Gomez', 'Howard', 'Ward', 'Cox', 'Richardson', 'Wood', 'Watson',
  'Brooks', 'Bennett', 'Gray', 'James', 'Reyes', 'Cruz', 'Hughes', 'Price', 'Myers', 'Long',
  'Foster', 'Sanders', 'Ross', 'Morales', 'Powell', 'Sullivan', 'Russell', 'Ortiz', 'Jenkins', 'Gutierrez',
  'Perry', 'Butler', 'Barnes', 'Fisher', 'Henderson', 'Coleman', 'Simmons', 'Patterson', 'Jordan', 'Reynolds',
  'Hamilton', 'Graham', 'Kim', 'Gonzales', 'Alexander', 'Ramos', 'Wallace', 'Griffin', 'West', 'Cole',
  'Hayes', 'Chavez', 'Gibson', 'Bryant', 'Ellis', 'Stevens', 'Ross', 'Hansen', 'Diaz', 'Moreno',
  'Kennedy', 'Wells', 'Alvarez', 'Woods', 'Mendoza', 'Castillo', 'Olson', 'Webb', 'Washington', 'Tucker',
  'Ford', 'Mason', 'Kelly', 'Harrison', 'Duncan', 'Boyd', 'Spencer', 'Gordon', 'Riley', 'Cunningham',
  'Owens', 'Murray', 'Freeman', 'Pierce', 'Berry', 'Matthews', 'Ryan', 'Hunter', 'Khan', 'Patel',
  'Singh', 'Kumar', 'Shah', 'Mehta', 'Reddy', 'Nair', 'Iyer', 'Kapoor', 'Malhotra', 'Sharma',
  'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Tanaka', 'Yamamoto', 'Suzuki', 'Sato', 'Takahashi', 'Ito', 'Watanabe', 'Kimura', 'Nakamura', 'Kobayashi',
  'Park', 'Choi', 'Jung', 'Kang', 'Lim', 'Cho', 'Yoon', 'Jang', 'Han', 'Shin',
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schultz', 'Hoffmann',
  'Dubois', 'Laurent', 'Moreau', 'Lefebvre', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Gautier', 'Marchand',
  'Romano', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Conti', 'Marino', 'Greco', 'Bruno', 'Gallo',
  'Andersen', 'Hansen', 'Olsen', 'Larsen', 'Pedersen', 'Nilsen', 'Kristensen', 'Jensen', 'Eriksen', 'Berg',
  'Novak', 'Horvath', 'Kovac', 'Petrov', 'Volkov', 'Ivanov', 'Mikhailov', 'Pavlov', 'Sidorov', 'Morozov',
  'Costa', 'Silva', 'Santos', 'Pereira', 'Oliveira', 'Souza', 'Almeida', 'Ribeiro', 'Carvalho', 'Teixeira',
  'Hassan', 'Ahmed', 'Khan', 'Ali', 'Rahman', 'Malik', 'Akhtar', 'Sheikh', 'Raza', 'Abbasi',
];

export function generatePerson() {
  const isMale = Math.random() < 0.5;
  const firstNames = isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return {
    name: `${first} ${last}`,
    gender: isMale ? 'male' : 'female',
    age: Math.floor(Math.random() * 28) + 22,
  };
}
