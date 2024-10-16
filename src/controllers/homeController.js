import connection from "../config/connectDB";
import jwt from "jsonwebtoken";
import md5 from "md5";
import e from "express";
import VietQR from "../public/js/vietQR";
require("dotenv").config();

const homePage = async (req, res) => {
  const [settings] = await connection.query(
    "SELECT `app`, `notice` FROM admin"
  );
  let app = settings[0].app;
  let notice = settings[0].notice;
  return res.render("home/index.ejs", { app, notice });
};
const gamePage = async (req, res) => {
  const [settings] = await connection.query(
    "SELECT `app`, `notice` FROM admin"
  );
  let app = settings[0].app;
  let notice = settings[0].notice;
  return res.render("home/all.ejs", { app, notice });
};
const getNotice = async (req, res) => {
  const [getNoti] = await connection.query("SELECT `notice` FROM admin");
  let Notice = getNoti[0].notice;
  return res.status(200).json({ Notice: Notice }).end();
};

const checkInPage = async (req, res) => {
  return res.render("checkIn/checkIn.ejs");
};

const checkDes = async (req, res) => {
  return res.render("checkIn/checkDes.ejs");
};

const checkRecord = async (req, res) => {
  return res.render("checkIn/checkRecord.ejs");
};

const checkInDetail = async (req, res) => {
  return res.render("checkIn/checkInDetail.ejs");
};

const checkAttendance = async (req, res) => {
  return res.render("checkIn/checkAttendance.ejs");
};

const present = async (req, res) => {
  return res.render("checkIn/present.ejs");
};

const addBank = async (req, res) => {
  return res.render("wallet/addbank.ejs");
};
const editBank = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [dataBank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ? ",
    [userInfo.phone]
  );
  if (dataBank.length == 0) {
    return res.redirect("/wallet/addBank");
  }
  return res.render("wallet/editbank.ejs", { dataBank });
};

// promotion
const promotionPage = async (req, res) => {
  return res.render("promotion/promotion.ejs");
};

const promotionmyTeamPage = async (req, res) => {
  return res.render("promotion/myTeam.ejs");
};

const promotionDesPage = async (req, res) => {
  return res.render("promotion/promotionDes.ejs");
};
const rechargeQRPage = async (req, res) => {   return res.render("wallet/rechargeQR.ejs"); };
//
const promotionLowerData = async (req, res) => {
  return res.render("promotion/prtLowerData.ejs");
};
const promotionRoseDetails = async (req, res) => {
  return res.render("promotion/prtRoseDetails.ejs");
};
const promotionNewRules = async (req, res) => {
  return res.render("promotion/prtNewRules.ejs");
};
const promotionCustomerCare = async (req, res) => {
  return res.render("promotion/prtCustomerCare.ejs");
};
//

const tutorialPage = async (req, res) => {
  return res.render("promotion/tutorial.ejs");
};

const bonusRecordPage = async (req, res) => {
  return res.render("promotion/bonusrecord.ejs");
};

// wallet
const walletPage = async (req, res) => {
  return res.render("wallet/index.ejs");
};

const rechargePage = async (req, res) => {
  return res.render("wallet/recharge.ejs");
};

const rechargerecordPage = async (req, res) => {
  return res.render("wallet/rechargerecord.ejs");
};

const withdrawalPage = async (req, res) => {
  return res.render("wallet/withdrawal.ejs");
};

const withdrawalrecordPage = async (req, res) => {
  return res.render("wallet/withdrawalrecord.ejs");
};

// member page
const mianPage = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `level` FROM users WHERE `token` = ? ",
    [auth]
  );
  let level = user[0].level;
  return res.render("member/index.ejs", { level });
};
const aboutPage = async (req, res) => {
  return res.render("member/about/index.ejs");
};

const privacyPolicy = async (req, res) => {
  return res.render("member/about/privacyPolicy.ejs");
};

const settingPage = async (req, res) => {
  return res.render("member/setting.ejs");
};

const walletProfilePage = async (req, res) => {
  return res.render("member/walletProfile.ejs");
};
const betHistoryPage = async (req, res) => {
  return res.render("member/betHistory.ejs");
};

const rechargeHistoryPage = async (req, res) => {
  return res.render("member/rechargeHistory.ejs");
};

const withdrawHistoryPage = async (req, res) => {
  return res.render("member/withdrawHistory.ejs");
};

const transactionHistoryPage = async (req, res) => {
  return res.render("member/transactionHistory.ejs");
};


const newtutorial = async (req, res) => {
  return res.render("member/newtutorial.ejs");
};

const forgot = async (req, res) => {
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `time_otp` FROM users WHERE token = ? ",
    [auth]
  );
  let time = user[0].time_otp;
  return res.render("member/forgot.ejs", { time });
};

const redenvelopes = async (req, res) => {
  return res.render("member/redenvelopes.ejs");
};

const riskAgreement = async (req, res) => {
  return res.render("member/about/riskAgreement.ejs");
};

const keFuMenu = async (req, res) => {
  let auth = req.cookies.auth;

  const [users] = await connection.query(
    "SELECT `level`, `ctv` FROM users WHERE token = ?",
    [auth]
  );

  let telegram = "";
  if (users.length == 0) {
    let [settings] = await connection.query(
      "SELECT `telegram`, `cskh` FROM admin"
    );
    telegram = settings[0].telegram;
  } else {
    if (users[0].level != 0) {
      var [settings] = await connection.query("SELECT * FROM admin");
    } else {
      var [check] = await connection.query(
        "SELECT `telegram` FROM point_list WHERE phone = ?",
        [users[0].ctv]
      );
      if (check.length == 0) {
        var [settings] = await connection.query("SELECT * FROM admin");
      } else {
        // var [settings] = await connection.query(
        //   "SELECT `telegram` FROM point_list WHERE phone = ?",
        //   [users[0].ctv]
        // );
        var [settings] = await connection.query("SELECT * FROM admin");
      }
    }
    telegram = settings[0].telegram;
  }

  return res.render("keFuMenu.ejs", { telegram });
};

const instagramPage = async (req,res) => {
  let auth = req.cookies.auth;

  const [users] = await connection.query(
      "SELECT `level`, `ctv` FROM users WHERE token = ?",
      [auth]
  );

  let telegram = "";
  if (users.length == 0) {
    let [settings] = await connection.query(
        "SELECT `telegram`, `cskh` FROM admin"
    );
    telegram = settings[0].telegram;
  } else {
    if (users[0].level != 0) {
      var [settings] = await connection.query("SELECT * FROM admin");
    } else {
      var [check] = await connection.query(
          "SELECT `telegram` FROM point_list WHERE phone = ?",
          [users[0].ctv]
      );
      if (check.length == 0) {
        var [settings] = await connection.query("SELECT * FROM admin");
      } else {
        var [settings] = await connection.query(
            "SELECT `telegram` FROM point_list WHERE phone = ?",
            [users[0].ctv]
        );
      }
    }
    telegram = settings[0].telegram;
  return res.render("instagram.ejs", {telegram});
}
}

const myProfilePage = async (req, res) => {
  return res.render("member/myProfile.ejs");
};
const detailLowerGradeUser = async (req, res) => {
  let id_lower_user = req.body.id_user;
  let date = req.body.selectedDate;
  let auth = req.cookies.auth;
  let today = convertDateFormat(date);
  if (!today || today.trim() === "") {
    today = new Date().toISOString().split("T")[0];
  }
  const [user] = await connection.query('SELECT * FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
  let id_user = user[0].id_user;
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [lowerUser] = await connection.query("SELECT * FROM users WHERE `id_user` = ? ", [id_lower_user]);
  if (!lowerUser) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  let phone = lowerUser[0].phone;
  let first_recharge_amount = 0;
  let total_recharge = 0;
  let first_rose = 0;
  let user_level = await calculateLowerGradeLevel(id_user, id_lower_user);
  //Tính tiền nạp đầu
  const [firstRecharge] = await connection.query("SELECT * FROM recharge WHERE `status` = 1 AND `phone` = ? ORDER BY `time` ASC", [phone]);
  if (firstRecharge && firstRecharge[0] && firstRecharge[0].money !== undefined) {
  first_recharge_amount = firstRecharge[0].money || 0;

  if (user[0].napdau == 1 && user_level === "F1") {
    if (first_recharge_amount >= 100000 && first_recharge_amount < 500000) {
      first_rose = 30000;
    } else if (first_recharge_amount >= 500000 && first_recharge_amount < 1000000) {
      first_rose = 100000;
    } else if (first_recharge_amount >= 1000000 && first_recharge_amount < 5000000) {
      first_rose = 150000;
    } else if (first_recharge_amount >= 5000000 && first_recharge_amount < 10000000) {
      first_rose = 500000;
    } else if (first_recharge_amount >= 10000000 && first_recharge_amount < 30000000) {
      first_rose = 1000000;
    } else if (first_recharge_amount >= 30000000 && first_recharge_amount < 50000000) {
      first_rose = 3000000;
    } else if (first_recharge_amount >= 50000000 && first_recharge_amount < 100000000) {
      first_rose = 3000000;
    } else if (first_recharge_amount >= 100000000) {
      first_rose = 5000000;
    }
  }}

  //Tính tổng nạp today
  const [todayRecharge] = await connection.query("SELECT SUM(money) as total_money FROM `recharge` WHERE `phone` = ? AND `today` = ? ", [phone, today]);
  total_recharge = todayRecharge[0].total_money || 0;

  //Tính tổng cược today
  let totalBet = 0;

  const resultk3 = await connection.query("SELECT SUM(money) AS money FROM result_k3 WHERE `phone` = ? AND `today` = ? ", [phone, today]);
  if (resultk3[0].length > 0 && resultk3[0][0].money) {
    totalBet = totalBet + Number(resultk3[0][0].money);
  }

  const resultd5 = await connection.query("SELECT SUM(money) AS money FROM result_5d WHERE `phone` = ? AND `today` = ? ", [phone, today]);
  if (resultd5[0].length > 0 && resultd5[0][0].money) {
    totalBet = totalBet + Number(resultd5[0][0].money);
  }

  const resultm1 = await connection.query("SELECT SUM(money) AS money FROM minutes_1 WHERE `phone` = ? AND `today` = ? ", [phone, today]);
  if (resultm1[0].length > 0 && resultm1[0][0].money) {
    totalBet = totalBet + Number(resultm1[0][0].money);
  }
  let total_bet_rose = 0;
  const [level] = await connection.query('SELECT * FROM level ');
  let level0 = level[0];
  if (user_level === "F1") {
    total_bet_rose = (totalBet / 100) * level0.f1;
  }
  if (user_level === "F2") {
    total_bet_rose = (totalBet / 100) * level0.f2;
  }
  if (user_level === "F3") {
    total_bet_rose = (totalBet / 100) * level0.f3;
  }
  if (user_level === "F4") {
    total_bet_rose = (totalBet / 100) * level0.f4;
  }
  if (user_level === "F5") {
    total_bet_rose = (totalBet / 100) * level0.f5;
  }
  if (user_level === "F6") {
    total_bet_rose = (totalBet / 100) * level0.f6;
  }
  if (user_level === "F7") {
    total_bet_rose = (totalBet / 100) * level0.f7;
  }
  if (user_level === "F8") {
    total_bet_rose = (totalBet / 100) * level0.f8;
  }
  if (user_level === "F9") {
    total_bet_rose = (totalBet / 100) * level0.f9;
  }
  if (user_level === "F10") {
    total_bet_rose = (totalBet / 100) * level0.f10;
  }

  // console.log("first_recharge_amount", first_recharge_amount);
  // console.log("total_bet_amount", totalBet);
  // console.log("total_recharge", total_recharge);
  // console.log("total_bet_rose", total_bet_rose);
  // console.log("first_recharge_rose", first_rose);
  // console.log("grade_level", user_level);
  // console.log("uid", id_lower_user);


  return res.status(200).json({
    message: `You are number 1!`,
    first_recharge_amount: first_recharge_amount,
    total_bet_amount: totalBet,
    total_recharge: total_recharge,
    total_bet_rose: total_bet_rose,
    first_recharge_rose: first_rose,
    grade_level: user_level,
    uid: id_lower_user,
    status: true
  });
};

const getFilteredCodes = (list) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(row => row.code).filter(code => code !== '');
};

const getFilteredPhones = (list) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(row => row.phone).filter(phone => phone !== '');
};

const getUsersByInvite = async (inviteList) => {
  const query = "SELECT `phone`, `code`,`invite`, `time`, `status`, `money` as surplus, `total_money` as total_amount FROM users WHERE `invite` IN (?)";
  const [result] = await connection.query(query, [inviteList]);
  return result;
};
const queryUsersByInviteCodes = async (inviteCodes) => {
  const [users] = await connection.query("SELECT * FROM users WHERE `invite` IN (?)", [inviteCodes]);
  return users;
};
const calculateLowerGradeLevel = async (id_user, id_lower_user) => {
  const [f0s] = await connection.query("SELECT * FROM `users` WHERE `id_user` = ? ", [id_user]);
  const f0CodeList = f0s.map(row => row.code).filter(code => code !== '');

  const levelCodes = [f0CodeList];
  let level = "";
  if(f0s.length > 0) {
    for (let i = 1; i <= 10; i++) {
      const users = await queryUsersByInviteCodes(levelCodes[i - 1]);
      if(users.length == 0) {
        break;
      }
      if (users.some(user => user.id_user === id_lower_user)) {
        level = "F" + i;
        break;
      }
      levelCodes.push(users.map(user => user.code).filter(code => code !== ''));
    }
    console.log("LEVELLLLLLLLLLLLLLLLLLLLLLLLLL", level)
    return level;
  }
};


  // if (f0s.length > 0) {
  //   let [f1s] = await connection.query("SELECT * FROM users WHERE `invite` IN (?) ", [f0CodeList]);
  //   let f1CodeList = f1s.map(row => row.code).filter(code => code !== '');
  //   let f1IdUserList = f1s.map(row => row.id_user).filter(code => code !== '');
  //   if (f1IdUserList.includes(id_lower_user)) {
  //     return "F1";
  //   }
  //   if (f1s.length > 0 && f1CodeList.length>0) {
  //     let [f2s] = await connection.query("SELECT * FROM users WHERE `invite` IN (?) ", [f1CodeList]);
  //     let f2CodeList = f2s.map(row => row.code).filter(code => code !== '');
  //     let f2IdUserList = f2s.map(row => row.id_user).filter(code => code !== '');
  //     if (f2IdUserList.includes(id_lower_user)) {
  //       return "F2";
  //     }
  //     if (f2s.length > 0 && f2CodeList.length>0) {
  //       let [f3s] = await connection.query("SELECT * FROM users WHERE `invite` IN (?) ", [f2CodeList]);
  //       let f3CodeList = f3s.map(row => row.code).filter(code => code !== '');
  //       let f3IdUserList = f3s.map(row => row.id_user).filter(code => code !== '');
  //       if (f3IdUserList.includes(id_lower_user)) {
  //         return "F3";
  //       }
  //       if (f3s.length > 0 && f3CodeList.length > 0) {
  //         let [f4s] = await connection.query("SELECT * FROM users WHERE `invite` IN (?) ", [f3CodeList]);
  //         let f4IdUserList = f4s.map(row => row.id_user).filter(code => code !== '');
  //         if (f4IdUserList.includes(id_lower_user)) {
  //           return "F4";
  //         }
  //       }
  //     }
  //   }
  // }
  // return "";
// };

function convertDateFormat(dateString) {
  if (typeof dateString !== 'undefined' && dateString.length > 0) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return dateString;
};

function genQrVIB(amount, content, bankInfo) {
  const VietQR = require("../public/js/vietQR");
  const vietQR = new VietQR();
  let stk = bankInfo.stk;
  let bank_name = bankInfo.name_bank;
  let bank_bin = "";
  if (bank_name === "VIB") {
    bank_bin = "970441";
  }
  vietQR
      .setBeneficiaryOrganization(bank_bin, stk)
      .setTransactionAmount(amount)
      .setAdditionalDataFieldTemplate(content);
  return vietQR.build();
}

const generateQRCode = async (req, res) => {
  let amount = req.body.amount;
  let auth = req.cookies.auth;
  const [user] = await connection.query('SELECT * FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const bank_recharge = await connection.query("SELECT `name_user`, `name_bank`, `stk` FROM bank_recharge WHERE type = 'momo'");
  let bankInfo = bank_recharge[0];
  let qr_string = genQrVIB(amount, user[0].id_user, bankInfo[0])
  return res.status(200).json({
    message: 'You are number 1!',
    id_user: user[0].id_user,
    amount:amount,
    bankInfo: bankInfo[0],
    qr_code: qr_string
  });
};


module.exports = {
  homePage,
  gamePage,
  getNotice,
  checkInPage,
  promotionPage,
  walletPage,
  mianPage,
  myProfilePage,
  promotionmyTeamPage,
  promotionDesPage,
  tutorialPage,
  bonusRecordPage,
  keFuMenu,
  rechargePage,
  rechargerecordPage,
  withdrawalPage,
  withdrawalrecordPage,
  aboutPage,
  privacyPolicy,
  riskAgreement,
  newtutorial,
  redenvelopes,
  forgot,
  checkDes,
  checkRecord,
  addBank,
  editBank,
  promotionLowerData,
  promotionRoseDetails,
  promotionNewRules,
  promotionCustomerCare,
  checkInDetail,
  checkAttendance,
  detailLowerGradeUser,
  present,
  generateQRCode,
  rechargeQRPage,
  instagramPage,
  settingPage,
  betHistoryPage,
  walletProfilePage,
  rechargeHistoryPage,
  withdrawHistoryPage,
  transactionHistoryPage
};
