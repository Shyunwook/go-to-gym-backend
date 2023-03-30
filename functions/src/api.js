var express = require("express");
var router = express.Router();
const { v1 } = require("uuid");
const moment = require('moment');
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const db = getFirestore();

const dummyData1 = require('./data/dummy1.json');
const dummyData2 = require('./data/dummy2.json');
const dummyData3 = require('./data/dummy3.json');

const collection_day = "Days";
const collection_workout = "Workout";
const CORRECTION_VALUE = 0.45359237;

const testUserId = "Bobby";
const testDay = "20230312";

router.post("/workouts", async function (req, res) {
  try {
    const data = json2;
    const userId = testUserId;
    const workoutKey = v1();

    const now = Date.now();
    const date = new Date(now);
    const day = testDay;
    //  const day=   `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;

    // 일별 운동 데이터 저장
    const docRefByDay = db.collection(collection_day).doc(userId);
    await docRefByDay
      .collection(day.toString())
      .doc(workoutKey)
      .set({ ...data, timeStamp: Timestamp.fromDate(new Date()) });
    // 운동 별 데이터 데이터 배치 저장
    const batch = db.batch();
    const userDocRef = db.collection(collection_workout).doc(userId);

    var performedList = data["performed"];

    for (const performed of performedList) {
      const workoutList = performed.workouts;

      for (const workout of workoutList) {
        const dataByWorkout = {
          timestamp: Timestamp.fromDate(new Date()),
          name: workout.name,
          sets: workout.sets,
          part: performed.part,
        };

        let maximum = 0;

        const entries = workout.sets.entries();
        for (const [index, set] of entries) {
          const maximumSet = workout.sets[maximum];
          const maximumMass = getMass(maximumSet);

          const current = set;
          const currentMass = getMass(current);

          if (maximumMass < currentMass) {
            maximum = index;
          }
        }

        dataByWorkout.maximumSet = workout.sets[maximum];
        const prevMaximumInfo = (
          await userDocRef.collection(workout.name).doc(day).get()
        ).data();

        if (
          prevMaximumInfo == undefined ||
          getMass(prevMaximumInfo) < getMass(dataByWorkout.maximumSet)
        ) {
          batch.set(
            userDocRef.collection(workout.name).doc(day),
            dataByWorkout.maximumSet
          );
        }

        batch.set(
          userDocRef
            .collection(workout.name)
            .doc(day)
            .collection(workoutKey)
            .doc(data["volume"].toString()),
          dataByWorkout
        );
      }
    }

    await batch.commit();
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// 사용자가 수행했던 운동 리스트 리턴
router.get("/workouts", async function (req, res) {
  const day = req.query.day;
  try {
    const userId = testUserId;
    const collections = await db
      .collection(collection_workout)
      .doc(userId)
      .listCollections();

    const workouts = collections.map((collection) => {
      return collection.id;
    });

    res.send(workouts);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// 운동별 최근 7회 max set 리턴
router.get("/records/:workout", async function (req, res) {
  try {
    const workout = req.params["workout"];
    const workoutDocRefs = await db
      .collection(collection_workout)
      .doc(testUserId)
      .collection(workout)
      .limit(7).get();
    

    const maxSetRecords = await db.getAll(...workoutDocRefs.docs.map((doc) => doc.ref));
    const data = {};

    for (const record of maxSetRecords) {
      data[record.id] = record.data();
    }

    res.send(data);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

router.get("/records", async function (req, res) {
  const day = req.query.day;
  try {
    const userId = testUserId;
    const workouts = await db
      .collectionGroup(day)
      .where("userId", "==", userId)
      .get();

    const result = workouts.docs.map((doc) => doc.data());
    console.log(Date(result.timeStamp));
    res.send(result);
    // res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// 더미데이터 세팅하는 개발용 api
router.post('/test', function (req, res) {
  setTestData();
  res.send(200);
});


async function setTestData() {
  const datas = [dummyData1, dummyData2, dummyData3];

  Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  }

  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //최댓값도 포함, 최솟값도 포함
  }

  const dateList = [];
  const randomData = [];
  for (let i = 0; i < 10; i++) {
    const day = new Date();
    const ramdomDay = day.addDays(getRandomIntInclusive(1, 20));
    const parsedDay = `${ramdomDay.getFullYear()}${(ramdomDay.getMonth() + 1).toString().padStart(2, "0")}${ramdomDay.getDate().toString().padStart(2, "0")}`
    dateList.push(parsedDay);

    const randomIndex = getRandomIntInclusive(0, 2);
    let selectedData = datas[randomIndex];
    if (randomIndex == 2) {
      selectedData.performed[0].workouts[0].sets[1].weight = getRandomIntInclusive(5, 15) * 10;

      console.log(JSON.stringify(selectedData));
    }

    randomData.push(selectedData);
  }

  for (const [index, data] of Object.entries(randomData)) {
    const performedList = data["performed"];
    const workoutKey = v1();
    const userId = testUserId;
    const targetDate = dateList[index].toString();

    // 일별 운동 데이터 저장
    const docRefByDay = db.collection(collection_day).doc(userId);
    await docRefByDay
      .collection(targetDate)
      .doc(workoutKey)
      .set({ ...data, timeStamp: Timestamp.fromDate(moment(targetDate, "YYYYMMDD").toDate()) });

    // 운동 별 데이터 데이터 배치 저장
    const batch = db.batch();
    const userDocRef = db.collection(collection_workout).doc(userId);

    for (const performed of performedList) {
      const workoutList = performed.workouts;

      for (const workout of workoutList) {
        const dataByWorkout = {
          timestamp: Timestamp.fromDate(moment(targetDate, "YYYYMMDD").toDate()),
          name: workout.name,
          sets: workout.sets,
          part: performed.part,
        };

        let maximum = 0;

        const entries = workout.sets.entries();
        for (const [index, set] of entries) {
          const maximumSet = workout.sets[maximum];
          const maximumMass = getMass(maximumSet);

          const current = set;
          const currentMass = getMass(current);

          if (maximumMass < currentMass) {
            maximum = index;
          }
        }

        dataByWorkout.maximumSet = workout.sets[maximum];
        const prevMaximumInfo = (
          await userDocRef.collection(workout.name).doc(dateList[index].toString()).get()
        ).data();

        if (
          prevMaximumInfo == undefined ||
          getMass(prevMaximumInfo) < getMass(dataByWorkout.maximumSet)
        ) {
          batch.set(
            userDocRef.collection(workout.name).doc(dateList[index].toString()),
            dataByWorkout.maximumSet
          );
        }

        batch.set(
          userDocRef
            .collection(workout.name)
            .doc(dateList[index].toString())
            .collection(workoutKey)
            .doc(data["volume"].toString()),
          dataByWorkout
        );
      }
    }

    await batch.commit();
  }
}



module.exports = router;


function getMass(setInfo) {
  return setInfo.isKillogram
    ? setInfo.weight
    : setInfo.weight * CORRECTION_VALUE;
}