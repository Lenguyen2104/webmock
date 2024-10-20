import connection from "../config/connectDB";
// import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from "request";
import {MD5} from "crypto-js";
require("dotenv").config();

let timeNow = Date.now();

const randomNumber = (min, max) => {
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};
const verifyCode = async (req, res) => {
  let auth = req.cookies.auth;
  let now = new Date().getTime();
  let timeEnd = +new Date() + 1000 * (60 * 2 + 0) + 500;
  let otp = randomNumber(100000, 999999);

  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let user = rows[0];
  if (user.time_otp - now <= 0) {
    request(
      `http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${user.phone}&msg=Your verification code is ${otp}&extend=${now}`,
      async (error, response, body) => {
        let data = JSON.parse(body);
        if (data.code == "00000") {
          await connection.execute(
            "UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ",
            [otp, timeEnd, user.phone]
          );
          return res.status(200).json({
            message: "Gửi thành công",
            status: true,
            timeStamp: timeNow,
            timeEnd: timeEnd,
          });
        }
      }
    );
  } else {
    return res.status(200).json({
      message: "Gửi SMS thường xuyên",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const userInfo = async (req, res) => {
  let auth = req.cookies.auth;

  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );

  if (!rows) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );

  let totalRecharge = 0;
  recharge.forEach((data) => {
    totalRecharge += data.money;
  });
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );
  let totalWithdraw = 0;
  withdraw.forEach((data) => {
    totalWithdraw += data.money;
  });

  const { id, password, ip, veri, ip_address, status, time, token, ...others } =
    rows[0];
  return res.status(200).json({
    message: "Success",
    status: true,
    data: {
      code: others.code,
      id_user: others.id_user,
      name_user: others.name_user,
      phone_user: others.phone,
      money_user: others.money,
    },
    totalRecharge: totalRecharge,
    totalWithdraw: totalWithdraw,
    timeStamp: timeNow,
  });
};

const changeUser = async (req, res) => {
  let auth = req.cookies.auth;
  let name = req.body.name;
  let type = req.body.type;

  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows || !type || !name)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  switch (type) {
    case "editname":
      await connection.query(
        "UPDATE users SET name_user = ? WHERE `token` = ? ",
        [name, auth]
      );
      return res.status(200).json({
        message: "Sửa đổi tên đăng nhập thành công",
        status: true,
        timeStamp: timeNow,
      });

    default:
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
  }
};

const changePassword = async (req, res) => {
  let auth = req.cookies.auth;
  let password = req.body.password;
  let newPassWord = req.body.newPassWord;
  // let otp = req.body.otp;

  if (!password || !newPassWord)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? AND `password` = ? ",
    [auth, md5(password)]
  );
  if (rows.length == 0)
    return res.status(200).json({
      message: "Mật khẩu không chính xác",
      status: false,
      timeStamp: timeNow,
    });

  // let getTimeEnd = Number(rows[0].time_otp);
  // let tet = new Date(getTimeEnd).getTime();
  // var now = new Date().getTime();
  // var timeRest = tet - now;
  // if (timeRest <= 0) {
  //     return res.status(200).json({
  //         message: 'Mã OTP đã hết hiệu lực',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // }

  // const [check_otp] = await connection.query('SELECT * FROM users WHERE `token` = ? AND `password` = ? AND otp = ? ', [auth, md5(password), otp]);
  // if(check_otp.length == 0) return res.status(200).json({
  //     message: 'Mã OTP không chính xác',
  //     status: false,
  //     timeStamp: timeNow,
  // });;

  await connection.query(
    "UPDATE users SET otp = ?, password = ? WHERE `token` = ? ",
    [randomNumber(100000, 999999), md5(newPassWord), auth]
  );
  return res.status(200).json({
    message: "Sửa đổi mật khẩu thành công",
    status: true,
    timeStamp: timeNow,
  });
};

const checkInHandling = async (req, res) => {
  let auth = req.cookies.auth;
  let data = req.body.data;

  if (!auth)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  if (!data) {
    const [point_list] = await connection.query(
      "SELECT * FROM point_list WHERE `phone` = ? ",
      [rows[0].phone]
    );
    return res.status(200).json({
      message: "Nhận thành công",
      datas: point_list,
      status: true,
      timeStamp: timeNow,
    });
  }
  if (data) {
    if (data == 1) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 100000;
      if (point_list.total1) {
        if (check >= data && point_list.total1 != 0) {
          await connection.query(
            "UPDATE users SET money = money + ? WHERE phone = ? ",
            [point_list.total1, rows[0].phone]
          );
          await connection.query(
            "UPDATE point_list SET total1 = ? WHERE phone = ? ",
            [0, rows[0].phone]
          );
          return res.status(200).json({
            message: `Bạn vừa nhận được ${point_list.total1}.00₫`,
            status: true,
            timeStamp: timeNow,
          });
        } else if (check < get && point_list.total1 != 0) {
          return res.status(200).json({
            message: "Bạn chưa đủ điều kiện để nhận quà",
            status: false,
            timeStamp: timeNow,
          });
        } else if (point_list.total1 == 0) {
          return res.status(200).json({
            message: "Bạn đã nhận phần quà này rồi",
            status: false,
            timeStamp: timeNow,
          });
        }
      }
    }
    if (data == 2) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 200000;
      if (check >= get && point_list.total2 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total2, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total2 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total2}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total2 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total2 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 3) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 500000;
      if (check >= get && point_list.total3 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total3, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total3 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total3}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total3 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total3 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 4) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 2000000;
      if (check >= get && point_list.total4 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total4, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total4 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total4}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total4 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total4 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 5) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 5000000;
      if (point_list.total5) {
        if (check >= get && point_list.total5 != 0) {
          await connection.query(
            "UPDATE users SET money = money + ? WHERE phone = ? ",
            [point_list.total5, rows[0].phone]
          );
          await connection.query(
            "UPDATE point_list SET total5 = ? WHERE phone = ? ",
            [0, rows[0].phone]
          );
          return res.status(200).json({
            message: `Bạn vừa nhận được ${point_list.total5}.00₫`,
            status: true,
            timeStamp: timeNow,
          });
        } else if (check < get && point_list.total5 != 0) {
          return res.status(200).json({
            message: "Bạn chưa đủ điều kiện để nhận quà",
            status: false,
            timeStamp: timeNow,
          });
        } else if (point_list.total5 == 0) {
          return res.status(200).json({
            message: "Bạn đã nhận phần quà này rồi",
            status: false,
            timeStamp: timeNow,
          });
        }
      }
    }
    if (data == 6) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 10000000;
      if (check >= get && point_list.total6 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total6, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total6 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total6}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total6 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total6 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 7) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].total_money;
      let point_list = point_lists[0];
      let get = 20000000;
      if (check >= get && point_list.total7 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total7, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total7 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `Bạn vừa nhận được ${point_list.total7}.00₫`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total7 != 0) {
        return res.status(200).json({
          message: "Bạn chưa đủ điều kiện để nhận quà",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total7 == 0) {
        return res.status(200).json({
          message: "Bạn đã nhận phần quà này rồi",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  }
};

function formateT(params) {
  let result = params < 10 ? "0" + params : params;
  return result;
}

function timerJoin(params = "") {
  let date = "";
  if (params) {
    date = new Date(Number(params));
  } else {
    date = Date.now();
    date = new Date(Number(date));
  }
  let years = formateT(date.getFullYear());
  let months = formateT(date.getMonth() + 1);
  let days = formateT(date.getDate());
  let weeks = formateT(date.getDay());

  let hours = formateT(date.getHours());
  let minutes = formateT(date.getMinutes());
  let seconds = formateT(date.getSeconds());
  // return years + '-' + months + '-' + days + ' ' + hours + '-' + minutes + '-' + seconds;
  return years + " - " + months + " - " + days;
}

const promotion = async (req, res) => {
  debugger;
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT * FROM users WHERE token = ? ",
    [auth]
  );

  const [rechargeLowerGrade] = await connection.query(
    "SELECT * FROM `recharge` WHERE `status` = 1 ORDER BY `recharge`.`today` ASC "
  );

  // console.log(">>>>rechargeLowerGrade:", rechargeLowerGrade);

  let totalOfMoney = 0;

  for (let i = 0; i < rechargeLowerGrade.length; i++) {
    totalOfMoney += rechargeLowerGrade[i].money;
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const todayRecharges = rechargeLowerGrade.filter(
    (item) => item.today === currentDate
  );

  const currentTime = Date.now();

  const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;

  const recentItems = rechargeLowerGrade.filter((item) => {
    return parseInt(item.time) >= twentyFourHoursAgo;
  });

  const totalMoney = recentItems.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.money;
  }, 0);

  const napdauValue = user[0].napdau;
  const tongcuocValue = user[0].tongcuoc;
  const moneyValue = user[0].money;

  const [level] = await connection.query("SELECT * FROM level");
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];

  const [f1s] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
    [userInfo.code]
  );

  let f1_today = 0;
  for (let i = 0; i < f1s?.length; i++) {
    const f1_time = f1s[i]?.time; // Mã giới thiệu f1
    let check = timerJoin(f1_time) == timerJoin() ? true : false;
    if (check) {
      f1_today += 1;
    }
  }

  let f_all_today = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const f1_time = f1s[i].time; // time f1
    let check_f1 = timerJoin(f1_time) == timerJoin() ? true : false;
    if (check_f1) f_all_today += 1;
    // tổng f1 mời đc hôm nay
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let j = 0; j < f2s.length; j++) {
      const f2_code = f2s[j].code; // Mã giới thiệu f2
      const f2_time = f2s[j].time; // time f2
      let check_f2 = timerJoin(f2_time) == timerJoin() ? true : false;
      if (check_f2) f_all_today += 1;
      // tổng f2 mời đc hôm nay
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let k = 0; k < f3s.length; k++) {
        const f3_code = f3s[k].code; // Mã giới thiệu f3
        const f3_time = f3s[k].time; // time f3
        let check_f3 = timerJoin(f3_time) == timerJoin() ? true : false;
        if (check_f3) f_all_today += 1;
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        for (let l = 0; l < f4s.length; l++) {
          const f4_code = f4s[l].code; // Mã giới thiệu f4
          const f4_time = f4s[l].time; // time f4
          let check_f4 = timerJoin(f4_time) == timerJoin() ? true : false;
          if (check_f4) f_all_today += 1;
          const [f5s] = await connection.query(
            "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
            [f4_code]
          );
          for (let m = 0; m < f5s.length; m++) {
            const f5_code = f5s[m].code; // Mã giới thiệu f5
            const f5_time = f5s[m].time; // time f5
            let check_f5 = timerJoin(f5_time) == timerJoin() ? true : false;
            if (check_f5) f_all_today += 1;
            // Handle f5 if needed
          }
        }
      }
    }
  }

  // Tổng số f2
  let f2 = 0;
  let array12 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1

    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    // console.log("🚀 ~ promotion ~ f2s:", f2s);
    const [f2s1] = await connection.query(
      "SELECT * FROM users WHERE `code` = ? ",
      [f1s[i].code]
    );
    // console.log(f2s1);
    array12.push(f2s1);

    // f2 += f2s.length;
    // array12.push(f2s);
    // console.log(array12);
    // f2 = f2s;
  }

  // Tổng số f3
  let f3 = 0;
  let array13 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    // console.log("🚀 ~ promotion ~ f2s:", f2s);
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      const [f2s1] = await connection.query(
        "SELECT * FROM users WHERE `code` = ? ",
        [f2s[i].code]
      );
      // console.log(f2s1);
      array13.push(f2s1);
      if (f3s.length > 0) f3 += f3s.length;
    }
  }

  // Tổng số f4
  let f4 = 0;
  let array14 = [];
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code; // Mã giới thiệu f1
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let i = 0; i < f3s.length; i++) {
        const f3_code = f3s[i].code;
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        array13.push(f4s);
        if (f4s.length > 0) f4 += f4s.length;
      }
    }
  }

  // SELECT F0 -> F4

  const [sf0] = await connection.query(
    "SELECT * FROM users WHERE `invite` = ? ",
    [userInfo.code]
  );
  // console.log("🚀 ~ promotion ~ sf0:", sf0);

  let sf1 = 0;
  let array_sf1 = [];

  for (let i = 0; i < sf0.length; i++) {
    const inviteCode = sf0[i].code;
    const [result] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [inviteCode, userInfo.code]
    );
    array_sf1.push(result);
    sf1 += result.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf1:", array_sf1);

  let sf2 = 0;
  let array_sf2 = [];

  const f1Codes = [];
  for (let i = 0; i < array_sf1.length; i++) {
    const f1Data = array_sf1[i];
    for (let j = 0; j < f1Data.length; j++) {
      const f1 = f1Data[j];
      if (f1.code !== userInfo.code) {
        f1Codes.push(f1.code);
      }
    }
  }

  for (let i = 0; i < f1Codes.length; i++) {
    const f1_code = f1Codes[i];
    const [result_f2] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f1_code, userInfo.code]
    );
    array_sf2.push(result_f2);
    sf2 += result_f2.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf2:", array_sf2);

  let sf3 = 0;
  let array_sf3 = [];

  const f2Codes = [];
  for (let i = 0; i < array_sf2.length; i++) {
    const f2Data = array_sf2[i];
    for (let j = 0; j < f2Data.length; j++) {
      const f2 = f2Data[j];
      if (!f1Codes.includes(f2.code)) {
        f2Codes.push(f2.code);
      }
    }
  }

  for (let i = 0; i < f2Codes.length; i++) {
    const f2_code = f2Codes[i];
    const [result_f3] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f2_code, userInfo.code]
    );
    array_sf3.push(result_f3);
    sf3 += result_f3.length;
  }

  // console.log("🚀 ~ promotion ~ array_sf3:", array_sf3);

  let sf4 = 0;
  let array_sf4 = [];
  const f3Codes = [];
  for (let i = 0; i < array_sf2.length; i++) {
    const f2Data = array_sf2[i];
    for (let j = 0; j < f2Data.length; j++) {
      const f2 = f2Data[j];
      if (!f1Codes.includes(f2.code)) {
        f3Codes.push(f2.code);
      }
    }
  }

  for (let i = 0; i < f3Codes.length; i++) {
    const f2_code = f3Codes[i];
    const [result_f4] = await connection.query(
      "SELECT * FROM users WHERE `invite` = ? AND `code` != ?",
      [f2_code, userInfo.code]
    );
    array_sf4.push(result_f4);
    sf4 += result_f4.length;
  }

  let allData = [];

  allData = allData.concat(sf0);

  for (let i = 0; i < array_sf1.length; i++) {
    allData = allData.concat(array_sf1[i]);
  }

  for (let i = 0; i < array_sf2.length; i++) {
    allData = allData.concat(array_sf2[i]);
  }

  for (let i = 0; i < array_sf3.length; i++) {
    allData = allData.concat(array_sf3[i]);
  }

  for (let i = 0; i < array_sf4.length; i++) {
    allData = allData.concat(array_sf4[i]);
  }

  const uniqueData = [...new Set(allData.map(JSON.stringify))].map(JSON.parse);

  const matchingInviteAndDifferentCode = sf0.filter(
    (data) => data.invite === userInfo.code && data.code !== userInfo.code
  );

  const dataWithNonZeroTotalMoney = matchingInviteAndDifferentCode.filter(
    (data) => data.total_money !== 0
  );

  const totalMoneySum = matchingInviteAndDifferentCode.reduce(
    (accumulator, currentValue) => accumulator + currentValue.total_money,
    0
  );

  const phonesToMatch = matchingInviteAndDifferentCode.map(
    (data) => data.phone
  );

  const matchingPhones = rechargeLowerGrade.filter((data) =>
    phonesToMatch.includes(data.phone)
  );

  const uniquePhones = [];
  const uniqueMatchingPhones = matchingPhones.filter((data) => {
    if (!uniquePhones.includes(data.phone)) {
      uniquePhones.push(data.phone);
      return true;
    }
    return false;
  });

  const currentDateDirectSubordinates = new Date().toISOString().slice(0, 10);
  const dataWithCurrentDate = uniqueMatchingPhones.filter(
    (data) => data.today === currentDateDirectSubordinates
  );

  // ---

  //
  const [userAll] = await connection.query("SELECT * FROM `users`");
  const codeUser = userInfo.code;
  const invitedUsersF1 = userAll.filter(
    (user) => user.invite === codeUser && user.code !== userInfo.code
  ); //F1 Array
  // console.log(">>> invitedUsersF1:", invitedUsersF1);
  const invitedUserCodesF2 = invitedUsersF1.map((user) => user.code);
  const usersWithSameInviteF2 = userAll.filter((user) =>
    invitedUserCodesF2.includes(user.invite)
  ); //F2 Array
  const userCodesWithSameInviteF3 = usersWithSameInviteF2.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF3 = userAll.filter((user) =>
    userCodesWithSameInviteF3.includes(user.invite)
  ); //F3 Array
  const invitedUserCodesF4 = usersWithSameInviteAsCodeF3.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF4 = userAll.filter((user) =>
    invitedUserCodesF4.includes(user.invite)
  ); //F4 Array
  const invitedUserCodesF5 = usersWithSameInviteAsCodeF4.map(
    (user) => user.code
  );
  const usersWithSameInviteAsCodeF5 = userAll.filter((user) =>
    invitedUserCodesF5.includes(user.invite)
  ); //F5 Array

  const allDataMySubordinates = [
    ...invitedUsersF1,
    ...usersWithSameInviteF2,
    ...usersWithSameInviteAsCodeF3,
    ...usersWithSameInviteAsCodeF4,
    ...usersWithSameInviteAsCodeF5,
  ];

  const dataWithNonZeroTotalMoneyMySubordinates = allDataMySubordinates.filter(
    (data) => data.total_money !== 0
  );

  const totalMoneySumMySubordinates = allDataMySubordinates.reduce(
    (accumulator, currentValue) => accumulator + currentValue.total_money,
    0
  );

  const phonesToMatMySubordinates = allDataMySubordinates.map(
    (data) => data.phone
  );

  const matchingPhonesMySubordinates = rechargeLowerGrade.filter((data) =>
    phonesToMatMySubordinates.includes(data.phone)
  );

  const uniquePhonesMySubordinates = [];
  const uniqueMatchingPhonesMySubordinates =
    matchingPhonesMySubordinates.filter((data) => {
      if (!uniquePhonesMySubordinates.includes(data.phone)) {
        uniquePhonesMySubordinates.push(data.phone);
        return true;
      }
      return false;
    });

  const currentDateDirectSubordinatesMySubordinates = new Date()
    .toISOString()
    .slice(0, 10);
  const dataWithCurrentDateMySubordinates =
    uniqueMatchingPhonesMySubordinates.filter(
      (data) => data.today === currentDateDirectSubordinatesMySubordinates
    );

  //F1
  const newArrayF1 = sf0.filter((item) => item.code !== item.invite);
  //F2
  const newArrayF2 = userAll.filter((user) => {
    return newArrayF1.some((newItem) => newItem.code === user.invite);
  });
  //F3
  const newArrayF3 = userAll.filter((user) => {
    return newArrayF2.some((newItem) => newItem.code === user.invite);
  });
  //F4
  const newArrayF4 = userAll.filter((user) => {
    return newArrayF3.some((newItem) => newItem.code === user.invite);
  });

  //BET
  const [minutes_1] = await connection.query("SELECT * FROM `minutes_1`");
  const newDataMinutes_1 = minutes_1.map((item) => ({
    ...item,
    money: item.money + item.fee,
  }));
  const [result_5d] = await connection.query("SELECT * FROM `result_5d`");
  const [result_k3] = await connection.query("SELECT * FROM `result_k3`");

  const sumPersonBet = [...newDataMinutes_1, ...result_5d, ...result_k3];

  // console.log(">>>>", matchedItems);
  let f1sl = [];
  let f2sl = [];
  let f3sl = [];
  let f4sl = [];
  let f5sl = [];
  let f6sl = [];
  let f7sl = [];
  let f8sl = [];
  let f9sl = [];
  let f10sl = [];

  let f1CodeList = [];
  let f2CodeList = [];
  let f3CodeList = [];
  let f4CodeList = [];
  let f5CodeList = [];
  let f6CodeList = [];
  let f7CodeList = [];
  let f8CodeList = [];
  let f9CodeList = [];
  let f10CodeList = [];


  let f1PhoneList = [];
  let f2PhoneList = [];
  let f3PhoneList = [];
  let f4PhoneList = [];
  let f5PhoneList = [];
  let f6PhoneList = [];
  let f7PhoneList = [];
  let f8PhoneList = [];
  let f9PhoneList = [];
  let f10PhoneList = [];

   // [f1sl] = await connection.query("SELECT `phone`, `code` FROM users WHERE `invite` = ? ", [userInfo.code]);
   // f1CodeList = f1sl.map(row => row.code).filter(code => code !== '');
   // f1PhoneList = f1sl.map(row => row.phone).filter(code => code !== '');

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

  f1sl = await getUsersByInvite([userInfo.code]);
  f1CodeList = getFilteredCodes(f1s);
  f1PhoneList = getFilteredPhones(f1s);
  let fArrays = [[f1s, f1CodeList, f1PhoneList]];
  if(f1sl.length > 0) {
    for (let i = 0; i < 9; i++) {
      const [previousFs, previousCodeList] = fArrays[i];

      if (previousCodeList.length > 0) {
        let fsl = await getUsersByInvite(previousCodeList);
        let codeList = getFilteredCodes(fsl);
        let phoneList = getFilteredPhones(fsl);

        if (codeList.length > 0) {
          fArrays.push([fsl, codeList, phoneList]);
        } else {
          break;
        }
      }
    }}

  if (fArrays.length >= 2) {
    [f2sl, f2CodeList, f2PhoneList] = fArrays[1];
  }

  if (fArrays.length >= 3) {
    [f3sl, f3CodeList, f3PhoneList] = fArrays[2];
  }

  if (fArrays.length >= 4) {
    [f4sl, f4CodeList, f4PhoneList] = fArrays[3];
  }

  if (fArrays.length >= 5) {
    [f5sl, f5CodeList, f5PhoneList] = fArrays[4];
  }

  if (fArrays.length >= 6) {
    [f6sl, f6CodeList, f6PhoneList] = fArrays[5];
  }

  if (fArrays.length >= 7) {
    [f7sl, f7CodeList, f7PhoneList] = fArrays[6];
  }

  if (fArrays.length >= 8) {
    [f8sl, f8CodeList, f8PhoneList] = fArrays[7];
  }

  if (fArrays.length >= 9) {
    [f9sl, f9CodeList, f9PhoneList] = fArrays[8];
  }

  if (fArrays.length >= 10) {
    [f10sl, f10CodeList, f10PhoneList] = fArrays[9];
  }
  // console.log("f1s", f1sl.length);
  // console.log("f1s", f1sl);
  // console.log("f2s", f2sl.length);
  // console.log("f2s", f2sl);
  // console.log("f3s", f3sl.length);
  // console.log("f3s", f3sl);
  // console.log("f4s", f4sl.length);
  // console.log("f4s", f4sl);
  // console.log("f5s", f5sl.length);
  // console.log("f5s", f5sl);
  // console.log("f6s", f6sl.length);
  // console.log("f6s", f6sl);
  // console.log("f7s", f7sl.length);
  // console.log("f7s", f7sl);
  // console.log("f8s", f8sl.length);
  // console.log("f8s", f8sl);
  // console.log("f9s", f9sl.length);
  // console.log("f9s", f9sl);
  // console.log("f10s", f10sl.length);
  // console.log("f10s", f10sl);

  const mergedPhoneList = [...f1PhoneList, ...f2PhoneList, ...f3PhoneList, ...f4PhoneList, ...f5PhoneList, ...f6PhoneList, ...f7PhoneList, ...f8PhoneList, ...f9PhoneList, ...f10PhoneList];
  const allPhones = Array.from(new Set(mergedPhoneList));
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
  }
  let todayIsTheDay = req.body.selectedDate;
  if (typeof todayIsTheDay === "undefined") {
    todayIsTheDay = new Date().toISOString().slice(0, 10);
  }
  todayIsTheDay = convertDateFormat(todayIsTheDay);
  async function renderSummaryData(phoneList, todayIsTheDay) {
    let today = todayIsTheDay;
    if(phoneList.length <= 0) {
      return {
        num_deposit_users: 0,
        total_deposit_amount: 0,
        num_bet_users: 0,
        total_bet_amount: 0,
        num_first_deposit_users: 0,
        total_first_deposit_amount: 0,
      };
    }
    const [first_recharge_list] = await connection.query("SELECT phone FROM `recharge` WHERE status = 1 AND phone IN (?) GROUP BY `phone` HAVING COUNT(*) = 1", [phoneList]);
    const [only_recharge_today] = await connection.query("SELECT phone FROM `recharge` WHERE phone NOT IN (SELECT phone FROM recharge WHERE status = 1 AND today < ?) AND phone IN (?) GROUP BY phone", [today,phoneList]);
    const combinedList = [...first_recharge_list, ...only_recharge_today].map(result => result.phone);
    const uniquePhoneList = [...new Set(combinedList)];
    let first_recharge_today_list = [];
    if (uniquePhoneList.length > 0 ) {
      [first_recharge_today_list] = await connection.query("SELECT DISTINCT phone FROM `recharge` WHERE status = 1 AND today = ? AND phone IN (?)", [today,uniquePhoneList]);
    }
    const [recharge_today_list] = await connection.query("SELECT DISTINCT phone FROM `recharge` WHERE status = 1 AND today = ? AND phone IN (?) ", [today,phoneList]);
    const recharge_total = await connection.query("SELECT SUM(money) as money FROM `recharge` WHERE status = 1 AND today = ? AND phone IN (?) ", [today,phoneList]);
    let total_recharge = 0;
    if (recharge_total[0].length > 0 && recharge_total[0][0].money) {
      total_recharge = Number(recharge_total[0][0].money);
    }
    let total_first_recharge = 0;
    for (const phone of uniquePhoneList) {
      const [first_recharge] = await connection.query("SELECT `phone`, `money` FROM `recharge` WHERE `status` = 1 AND `today` = ? AND `phone` = (?) ORDER BY time ASC", [today,phone]);
      if (first_recharge.length > 0 && first_recharge[0].money !== 0) {
        total_first_recharge += first_recharge[0].money;
      }
    }

    let totalBet = 0;
    const resultk3 = await connection.query("SELECT SUM(money) AS money FROM result_k3 WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    if (resultk3[0].length > 0 && resultk3[0][0].money) {
      totalBet = totalBet + Number(resultk3[0][0].money);
      // console.log("totalBet k3", totalBet);
    }
    const resultd5 = await connection.query("SELECT SUM(money) AS money FROM result_5d WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    if (resultd5[0].length > 0 && resultd5[0][0].money) {
      totalBet = totalBet + Number(resultd5[0][0].money);
      // console.log("totalBet d5", totalBet);
    }
    const resultm1 = await connection.query("SELECT SUM(money) AS money FROM minutes_1 WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    if (resultm1[0].length > 0 && resultm1[0][0].money) {
      totalBet = totalBet + Number(resultm1[0][0].money);
      // console.log("totalBet wg", totalBet);
    }

    const [k3Phones] = await connection.query("SELECT DISTINCT phone FROM result_k3 WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    const [d5Phones] = await connection.query("SELECT DISTINCT phone FROM result_5d WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    const [wingoPhones] = await connection.query("SELECT DISTINCT phone FROM minutes_1 WHERE `today` = ? AND phone IN (?) ", [today,phoneList]);
    const combinedPhones = [...k3Phones, ...d5Phones, ...wingoPhones].map(result => result.phone);
    const phones = [...new Set(combinedPhones)];
    // console.log("phones", phones.length);
    // console.log("totalBet", totalBet);
    // console.log("total_first_recharge", total_first_recharge);
    // console.log("recharge_total", total_recharge);
    // console.log("recharge_today_list", recharge_today_list.length);
    // console.log("first_recharge_today_list", first_recharge_today_list ? first_recharge_today_list.length : 0);
    return {
      num_deposit_users: recharge_today_list.length,
      total_deposit_amount: total_recharge,
      num_bet_users: phones.length,
      total_bet_amount: totalBet,
      num_first_deposit_users: first_recharge_today_list ? first_recharge_today_list.length : 0,
      total_first_deposit_amount: total_first_recharge,
    };
  }
  const summary_table = {
    summary_f_all: [await renderSummaryData(allPhones, todayIsTheDay)],
    summary_f_1: [await renderSummaryData(f1PhoneList,todayIsTheDay)],
    summary_f_2: [await renderSummaryData(f2PhoneList,todayIsTheDay)],
    summary_f_3: [await renderSummaryData(f3PhoneList,todayIsTheDay)],
    summary_f_4: [await renderSummaryData(f4PhoneList,todayIsTheDay)],
    summary_f_5: [await renderSummaryData(f5PhoneList,todayIsTheDay)],
    summary_f_6: [await renderSummaryData(f6PhoneList,todayIsTheDay)],
    summary_f_7: [await renderSummaryData(f7PhoneList,todayIsTheDay)],
    summary_f_8: [await renderSummaryData(f8PhoneList,todayIsTheDay)],
    summary_f_9: [await renderSummaryData(f9PhoneList,todayIsTheDay)],
    summary_f_10: [await renderSummaryData(f10PhoneList,todayIsTheDay)],
    summary_f_no_data: [await renderSummaryData(allPhones, todayIsTheDay)],
  };

  /*Render doi truc tiep man hinh promotion*/
  let uniquePhonesTodayArray = [];
  const [all_users] = await connection.query("SELECT * FROM `users`");
  if(allPhones.length > 0) {
    const [k3Phones_today] = await connection.query("SELECT `phone`, SUM(money) as bet_money FROM result_k3 WHERE `today` = ? AND phone IN (?) GROUP BY `phone`", [todayIsTheDay,allPhones]);
    const [d5Phones_today] = await connection.query("SELECT `phone`, SUM(money) as bet_money FROM result_5d WHERE `today` = ? AND phone IN (?) GROUP BY `phone`", [todayIsTheDay,allPhones]);
    const [wingoPhones_today] = await connection.query("SELECT `phone`, SUM(money) as bet_money FROM minutes_1 WHERE `today` = ? AND phone IN (?) GROUP BY `phone`", [todayIsTheDay,allPhones]);
    const [recharge_today] = await connection.query("SELECT phone FROM `recharge` WHERE `status` = 1 AND `today` = ? AND `phone` IN (?) GROUP BY phone", [todayIsTheDay,allPhones]);
    let register_today = [];
    function timerJoin(params = "") {
      let date = "";
      if (params) {
        date = new Date(Number(params));
      } else {
        date = Date.now();
        date = new Date(Number(date));
      }
      let years = formateT(date.getFullYear());
      let months = formateT(date.getMonth() + 1);
      let days = formateT(date.getDate());
      return years + "-" + months + "-" + days;
    }

    for (let i = 0; i < all_users?.length; i++) {
      const register_date = all_users[i]?.time; // Mã giới thiệu f1
      let check = timerJoin(register_date) == todayIsTheDay ? true : false;
      if (check) {
        register_today.push(all_users[i]);
      }
    }
    const allPhonesArray = [...k3Phones_today, ...d5Phones_today, ...wingoPhones_today, ...recharge_today, ...register_today].map(item => item.phone);
    uniquePhonesTodayArray = [...new Set(allPhonesArray)];
  }

  const renderFMemberByDate = (uniquePhonesTodayArray, fPhoneList, users) => {
    const commonPhones = uniquePhonesTodayArray.filter(phone => fPhoneList.includes(phone));
    const FMember = users.filter(user => commonPhones.includes(user.phone));
    return FMember;
  };

  /*Render doi truc tiep man hinh promotion*/
  const filteredDataRechargeLowerGradeMatchingInvitedUsersF1 =
    rechargeLowerGrade.filter((item) =>
      invitedUsersF1.some((user) => user.phone === item.phone)
    );

  const filteredDataWithStatusOne =
    filteredDataRechargeLowerGradeMatchingInvitedUsersF1.filter(
      (item) => item.status === 1
    );

  const totalMoneySumMoneyDataRechargeLowerF1 =
    filteredDataWithStatusOne.reduce(
      (accumulator, currentValue) => accumulator + currentValue.money,
      0
    );
  /*TINH CAP DUOI TRUC TIEP MAN PROMOTION*/
  let f1_recharge =[];
  let f1_recharger =[];
  let f1_total_direct_recharge =0;
  if(f1PhoneList.length>0) {
    [f1_recharge] = await connection.query("SELECT SUM(money) as money FROM `recharge` WHERE status = 1 AND phone IN (?) ", [f1PhoneList]);
    f1_total_direct_recharge = f1_recharge[0].money;
    [f1_recharger] = await connection.query("SELECT DISTINCT `phone` FROM `recharge` WHERE status = 1 AND phone IN (?) ", [f1PhoneList]);
  }
   /*TINH CAP DUOI TRUC TIEP MAN PROMOTION*/
  const dataDirectSubordinatesData = {
    registered_users_direct_subordinates: f1sl.length,
    depositing_users_direct_subordinates: f1_recharger.length,
    deposited_amount_direct_subordinates: f1_total_direct_recharge,
    first_deposit_users_direct_subordinates: f1_recharger.length,
  };

  const phonesToFilter = [
    ...newArrayF1,
    ...newArrayF2,
    ...newArrayF3,
    ...newArrayF4,
  ].map((item) => item.phone);

  const filteredDataDepositedAmountMySubordinates = rechargeLowerGrade.filter(
    (item) => phonesToFilter.includes(item.phone)
  );

  const filteredDataWithStatusOneMySubordinates =
    filteredDataDepositedAmountMySubordinates.filter(
      (item) => item.status === 1
    );

  const totalMoneySumMoneyMySubordinates =
    filteredDataWithStatusOneMySubordinates.reduce(
      (accumulator, currentValue) => accumulator + currentValue.money,
      0
    );
/*TINH CAP DUOI CUA TOI MAN PROMOTION*/
  let fall_recharge =[];
  let fall_recharger =[];
  let fall_total_direct_recharge =0;
  if(allPhones.length>0) {
    [fall_recharge] = await connection.query("SELECT SUM(money) as money FROM `recharge` WHERE status = 1 AND phone IN (?) ", [allPhones]);
    fall_total_direct_recharge = fall_recharge[0].money;
    [fall_recharger] = await connection.query("SELECT DISTINCT `phone` FROM `recharge` WHERE status = 1 AND phone IN (?) ", [allPhones]);
  }
  const dataMySubordinates = {
    registered_users_my_subordinates: allPhones.length,
    depositing_users_my_subordinates: fall_recharger.length,
    deposited_amount_my_subordinates: fall_total_direct_recharge,
    first_deposit_users_my_subordinates: fall_recharger.length,
  };

  // console.log("Kết quả tìm kiếm:", filteredDataDepositedAmountMySubordinates);
  let selected_f1 = renderFMemberByDate(uniquePhonesTodayArray, f1PhoneList, all_users);
  let selected_f2 = renderFMemberByDate(uniquePhonesTodayArray, f2PhoneList, all_users);
  let selected_f3 = renderFMemberByDate(uniquePhonesTodayArray, f3PhoneList, all_users);
  let selected_f4 = renderFMemberByDate(uniquePhonesTodayArray, f4PhoneList, all_users);
  let selected_f5 = renderFMemberByDate(uniquePhonesTodayArray, f5PhoneList, all_users);
  let selected_f6 = renderFMemberByDate(uniquePhonesTodayArray, f6PhoneList, all_users);
  let selected_f7 = renderFMemberByDate(uniquePhonesTodayArray, f7PhoneList, all_users);
  let selected_f8 = renderFMemberByDate(uniquePhonesTodayArray, f8PhoneList, all_users);
  let selected_f9 = renderFMemberByDate(uniquePhonesTodayArray, f9PhoneList, all_users);
  let selected_f10 = renderFMemberByDate(uniquePhonesTodayArray, f10PhoneList, all_users);
  let selected_f_all = [...selected_f1, ...selected_f2, ...selected_f3, ...selected_f4, ...selected_f5, ...selected_f6, ...selected_f7, ...selected_f8, ...selected_f9, ...selected_f10];

  return res.status(200).json({
    message: "Nhận thành công",
    level: level,
    info: user,
    status: true,
    invite: {
      select_f_all: selected_f_all,
      select_f1: selected_f1,
      select_f2: selected_f2,
      select_f3: selected_f3,
      select_f4: selected_f4,
      select_f5: selected_f5,
      select_f6: selected_f6,
      select_f7: selected_f7,
      select_f8: selected_f8,
      select_f9: selected_f9,
      select_f10: selected_f10,
      data_direct_subordinates: dataDirectSubordinatesData,
      data_my_subordinates: dataMySubordinates,
      summary: summary_table,
      f1: f1s.length,
      total_f: f1s.length + f2 + f3 + f4,
      // f2: array12,
      // f3: array13,
      // f4: array14,
      f1_today: f1_today,
      f_all_today: f_all_today,
      roses_f1: userInfo.roses_f1,
      roses_f: userInfo.roses_f,
      roses_all: userInfo.roses_f,
      roses_today: userInfo.roses_today,
      napdau: napdauValue,
      tongcuoc: tongcuocValue,
      money: moneyValue,
      number_of_people_deposit: rechargeLowerGrade.length,
      number_of_people_deposit_today: todayRecharges.length,
      total_of_money: totalOfMoney + moneyValue,
    },
    timeStamp: timeNow,
  });
};

const myTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  const [level] = await connection.query("SELECT * FROM level");
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  return res.status(200).json({
    message: "Nhận thành công",
    level: level,
    info: user,
    status: true,
    timeStamp: timeNow,
  });
};

const listMyTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];

  const [f1] = await connection.query(
    "SELECT `id_user`, `name_user`,`status`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC",
    [userInfo.code]
  );

  const [mem] = await connection.query(
    "SELECT `id_user`, `phone`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );
  const [total_roses] = await connection.query(
    "SELECT `f1`, `time`, `chitiet` FROM roses WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );

  let newMem = [];
  mem.map((data) => {
    let objectMem = {
      id_user: data.id_user,
      phone:
        "84" + data.phone.slice(0, 1) + "****" + String(data.phone.slice(-4)),
      time: data.time,
    };

    return newMem.push(objectMem);
  });
  return res.status(200).json({
    message: "Nhận thành công",
    f1: f1,
    mem: newMem,
    total_roses: total_roses,
    status: true,
    timeStamp: timeNow,
  });
};

const recharge = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let type = req.body.type;
  let typeid = req.body.typeid;
  let bankName = req.body.bank_name;

  if (type != "cancel") {
    if (!auth || !money || money < 50000) {
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
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
  if (type == "cancel") {
    await connection.query(
      "UPDATE recharge SET status = 2 WHERE phone = ? AND id_order = ? AND status = ? ",
      [userInfo.phone, typeid, 0]
    );
    return res.status(200).json({
      message: "Hủy đơn thành công",
      status: true,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );
  if (recharge.length == 0) {
    let time = new Date().getTime();
    const date = new Date();
    function formateT(params) {
      let result = params < 10 ? "0" + params : params;
      return result;
    }

    function timerJoin(params = "") {
      let date = "";
      if (params) {
        date = new Date(Number(params));
      } else {
        date = new Date();
      }
      let years = formateT(date.getFullYear());
      let months = formateT(date.getMonth() + 1);
      let days = formateT(date.getDate());
      return years + "-" + months + "-" + days;
    }
    let checkTime = timerJoin(time);
    let id_time =
      date.getUTCFullYear() +
      "" +
      date.getUTCMonth() +
      1 +
      "" +
      date.getUTCDate();
    let id_order =
      Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
      10000000000000;
    // let vat = Math.floor(Math.random() * (2000 - 0 + 1) ) + 0;

    money = Number(money);
    let client_transaction_id = id_time + id_order;
    const formData = {
      username: process.env.accountBank,
      secret_key: process.env.secret_key,
      client_transaction: client_transaction_id,
      amount: money,
    };

    if (type == "momo") {
      const sql = `INSERT INTO recharge SET 
            id_order = ?,
            transaction_id = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            today = ?,
            url = ?,
            time = ?`;
      await connection.execute(sql, [
        client_transaction_id,
        "NULL",
        userInfo.phone,
        money,
        type,
        0,
        checkTime,
        "NULL",
        time,
      ]);
      const [recharge] = await connection.query(
        "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
        [userInfo.phone, 0]
      );
      return res.status(200).json({
        message: "Nhận thành công",
        datas: recharge[0],
        status: true,
        timeStamp: timeNow,
      });
    }

    if (type == "qr") {
      const sql = `INSERT INTO recharge SET 
            id_order = ?,
            transaction_id = ?,
            phone = ?,
            money = ?,
            type = ?,
            bank_name = ?,
            status = ?,
            today = ?,
            url = ?,
            time = ?`;
      await connection.execute(sql, [
        client_transaction_id,
        "NULL",
        userInfo.phone,
        money,
        type,
        bankName,
        0,
        checkTime,
        "NULL",
        time,
      ]);
      const [recharge] = await connection.query(
          "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
          [userInfo.phone, 0]
      );
      return res.status(200).json({
        message: "Nhận thành công",
        datas: recharge[0],
        status: true,
        timeStamp: timeNow,
      });
    }

    const sql = `INSERT INTO recharge SET 
        id_order = ?,
        transaction_id = ?,
        phone = ?,
        money = ?,
        type = ?,
        status = ?,
        today = ?,
        url = ?,
        time = ?`;
    await connection.execute(sql, [
      client_transaction_id,
      "0",
      userInfo.phone,
      money,
      type,
      0,
      checkTime,
      "0",
      time,
    ]);
    const [recharge] = await connection.query(
      "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
      [userInfo.phone, 0]
    );
    return res.status(200).json({
      message: "Tạo đơn thành công",
      datas: recharge[0],
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Nhận thành công",
      datas: recharge[0],
      status: true,
      timeStamp: timeNow,
    });
  }
};

const addBank = async (req, res) => {
  let auth = req.cookies.auth;
  let name_bank = req.body.name_bank;
  let name_user = req.body.name_user;
  let stk = req.body.stk;
  let bankid = req.body.bankid;
  // let tp = req.body.tp;
  // let email = req.body.email;
  // let sdt = req.body.sdt;
  // let tinh = req.body.tinh;
  // let chi_nhanh = req.body.chi_nhanh;

  if (!auth || !name_bank || !name_user || !stk) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [user_bank] = await connection.query(
    "SELECT * FROM user_bank WHERE stk = ? ",
    [stk]
  );
  const [user_bank2] = await connection.query(
    "SELECT * FROM user_bank WHERE phone = ? ",
    [userInfo.phone]
  );
  if (user_bank.length == 0 && user_bank2.length == 0) {
    let time = new Date().getTime();
    const sql = `INSERT INTO user_bank SET 
        phone = ?,
        name_bank = ?,
        bank_id = ?,
        name_user = ?,
        stk = ?,
        time = ?`;
    await connection.execute(sql, [
      userInfo.phone,
      name_bank,
      bankid,
      name_user,
      stk,
      time,
    ]);
    return res.status(200).json({
      message: "Thêm ngân hàng thành công",
      status: true,
      timeStamp: timeNow,
    });
  } else if (user_bank.length > 0) {
    return res.status(200).json({
      message: "Số tài khoản này đã tồn tại trong hệ thống",
      status: false,
      timeStamp: timeNow,
    });
  } else if (user_bank2.length > 0) {
    return res.status(200).json({
      message: "Tài khoản đã liên kết ngân hàng rồi",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const editBank = async (req, res) => {
  let auth = req.cookies.auth;
  let name_bank = req.body.name_bank;
  let name_user = req.body.name_user;
  let stk = req.body.stk;
  /*     let tp = req.body.tp;
    let email = req.body.email;
    let sdt = req.body.sdt;
    let tinh = req.body.tinh;
    let chi_nhanh = req.body.chi_nhanh; */

  if (!auth || !name_bank || !name_user || !stk) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [check] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ? ",
    [userInfo.phone]
  );
  if (check.length > 0) {
    let time = new Date().getTime();
    const sql = `UPDATE user_bank SET 
        name_bank = ?,
        name_user = ?,
        stk = ?
        WHERE phone = ?`;
    try {
      await connection.execute(sql, [
        name_bank,
        name_user,
        stk,
        userInfo.phone,
      ]);
    } catch (err) {
      console.log(err);
    }
    return res.status(200).json({
      message: "Sửa ngân hàng thành công",
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Không tồn tại bank",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const infoUserBank = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money`, `tongcuoc` FROM users WHERE `token` = ? ",
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
  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

  function timerJoin(params = "") {
    let date = "";
    if (params) {
      date = new Date(Number(params));
    } else {
      date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    return years + "-" + months + "-" + days;
  }
  let date = new Date().getTime();
  let checkTime = timerJoin(date);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND today = ? AND status = 1 ",
    [userInfo.phone, checkTime]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ? AND today = ? ",
    [userInfo.phone, checkTime]
  );
  let total = 0;
  recharge.forEach((data) => {
    total += data.money;
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += data.money;
  });

  let result = 0;
  if (total - total2 > 0) result = total - total2;

  const [userBank] = await connection.query(
    "SELECT * FROM user_bank WHERE phone = ? ",
    [userInfo.phone]
  );

  const mergedUser = {
    ...user,
    betbet: userInfo.tongcuoc
  };



  return res.status(200).json({
    message: "Nhận thành công",
    datas: userBank,
    userInfo: mergedUser,
    result: result,
    status: true,
    timeStamp: timeNow,
  });
};

const withdrawal3 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let password = req.body.password;
  if (!auth || !money || !password || money < 50000) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money`, `tongcuoc` FROM users WHERE `token` = ? AND password = ?",
    [auth, md5(password)]
  );

  if (user.length == 0) {
    return res.status(200).json({
      message: "Mật khẩu không chính xác",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  const date = new Date();
  let id_time =
    date.getUTCFullYear() +
    "" +
    date.getUTCMonth() +
    1 +
    "" +
    date.getUTCDate();
  let id_order =
    Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
    10000000000000;

  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

  function timerJoin(params = "") {
    let date = "";
    if (params) {
      date = new Date(Number(params));
    } else {
      date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    return years + "-" + months + "-" + days;
  }
  let dates = new Date().getTime();
  let checkTime = timerJoin(dates);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND today = ? AND status = 1 ",
    [userInfo.phone, checkTime]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ? AND today = ? ",
    [userInfo.phone, checkTime]
  );
  // let total = 0;
  recharge.forEach((data) => {
    //      total += data.money;
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += data.money;
  });

  let result = 0;
  // if(total - total2 > 0) result = total - total2;

  // Calculate money (tien rut) > tong cuoc (tien nap) -> allow withdraw

  if(userInfo.tongcuoc !== 0) {
    return res.status(200).json({
      message: "Tổng tiền cược chưa đủ để thực hiện yêu cầu",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user_bank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ?",
    [userInfo.phone]
  );
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ? AND `today` = CURDATE() ",
    [userInfo.phone]
  );
  console.log("withdraw1", withdraw);
  if (user_bank.length != 0) {
    if (withdraw.length < 5) {
    if (userInfo.money - money >= 0) {
      if (result == 0) {
        let infoBank = user_bank[0];
        const sql = `INSERT INTO withdraw SET 
                    id_order = ?,
                    phone = ?,
                    money = ?,
                    stk = ?,
                    name_bank = ?,
                    name_user = ?,
                    status = ?,
                    today = ?,
                    time = ?`;
        await connection.execute(sql, [
          id_time + "" + id_order,
          userInfo.phone,
          money,
          infoBank.stk,
          infoBank.name_bank,
          infoBank.name_user,
          0,
          checkTime,
          dates,
        ]);
        await connection.query(
          "UPDATE users SET money = money - ? WHERE phone = ? ",
          [money, userInfo.phone]
        );
        let idOrder = id_time.toString() + "" +id_order.toString();
        console.log("idOrder0", idOrder);
        let [info] = await connection.query(
            "SELECT * FROM withdraw WHERE `phone` = ? AND `id_order` = ? ",
            [userInfo.phone,idOrder]
        );
        console.log("info0", info[0])
        let payloadJson = `{"cardname" : "${infoBank.name_user}", "cardno" : "${infoBank.stk}", "bankid" : "${infoBank.bank_id}", "bankname" : "${infoBank.name_bank}"}`;
        let payload = JSON.parse(payloadJson);
        console.log("payloadJson", payload);
        return res.status(200).json({
          message: "Rút tiền thành công",
          status: true,
          money: userInfo.money - money,
          amount: info[0].money,
          id_order: info[0].id_order,
          payload: payload,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Tổng tiền cược chưa đủ để thực hiện yêu cầu",
          status: false,
          timeStamp: timeNow,
        });
      }
    } else {
      return res.status(200).json({
        message: "Số dư không đủ để thực hiện yêu cầu",
        status: false,
        timeStamp: timeNow,
      });
    }
    } else {
       return res.status(200).json({
           message: 'Mỗi ngày bạn chỉ được thực hiện 5 lần rút tiền',
           status: false,
           timeStamp: timeNow,
       });
    }
  } else {
    return res.status(200).json({
      message: "Vui lòng liên kết ngân hàng trước",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const recharge2 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );
  const [bank_recharge] = await connection.query(
    "SELECT * FROM bank_recharge "
  );
  if (recharge.length != 0) {
    return res.status(200).json({
      message: "Nhận thành công",
      datas: recharge[0],
      infoBank: bank_recharge,
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listRecharge = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Nhận thành công",
    datas: recharge,
    status: true,
    timeStamp: timeNow,
  });
};

const search = async (req, res) => {
  let auth = req.cookies.auth;
  let phone = req.body.phone;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `level` FROM users WHERE `token` = ? ",
    [auth]
  );
  if (user.length == 0) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  const [resultk3] = await connection.query(`SELECT SUM(money) AS money
                                             FROM result_k3
                                             WHERE phone = ?`, [user.phone]);
  const [result5d] = await connection.query(`SELECT SUM(money) AS money
                                             FROM result_5d
                                             WHERE phone = ?`, [user.phone]);
  const [resultwingo] = await connection.query(`SELECT SUM(money) AS money
                                                FROM minutes_1
                                                WHERE phone = ?`, [user.phone]);

  const betbet = (resultk3[0].money || 0) + (result5d[0].money || 0) + (resultwingo[0].money || 0);
  user.betbet = betbet;
  if (userInfo.level == 1) {
    let userSearch;
    let [userPhone] = await connection.query(
        `SELECT * FROM users WHERE phone = ? ORDER BY id DESC `,
        [phone]
    );
    let [userIds] = await connection.query(
        `SELECT * FROM users WHERE id_user = ? ORDER BY id DESC `,
        [phone]
    );
    if (userPhone.length === 0) {
      userSearch = [userIds]
    } else {
      userSearch = [userPhone];
    }

    const [users] = userSearch;

    const resultsk3 = [];
    for (const user of users) {
      const [result] = await connection.query(`SELECT SUM(money) AS money FROM result_k3 WHERE phone = ?`, [user.phone]);
      resultsk3.push({phone: user.phone, money: result[0].money || 0});
    }
    const resultsd5 = [];
    for (const user of users) {
      const [result] = await connection.query(`SELECT SUM(money) AS money FROM result_5d WHERE phone = ?`, [user.phone]);
      resultsd5.push({phone: user.phone, money: result[0].money || 0});
    }
    const resultsm1 = [];
    for (const user of users) {
      const [result] = await connection.query(`SELECT SUM(money) AS money FROM minutes_1 WHERE phone = ?`, [user.phone]);
      resultsm1.push({phone: user.phone, money: result[0].money || 0});
    }

    const mergedArray = [];
    for (const item of resultsk3) {
      const existingItem = mergedArray.find((el) => el.phone === item.phone);
      if (existingItem) {
        existingItem.money = Number(existingItem.money) +Number(item.money);
      } else {
        mergedArray.push({ ...item });
      }
    }

    for (const item of resultsd5) {
      const existingItem = mergedArray.find((el) => el.phone === item.phone);
      if (existingItem) {
        existingItem.money = Number(existingItem.money) +Number(item.money);
      } else {
        mergedArray.push({ ...item });
      }
    }

    for (const item of resultsm1) {
      const existingItem = mergedArray.find((el) => el.phone === item.phone);
      if (existingItem) {
        existingItem.money = Number(existingItem.money) +Number(item.money);
      } else {
        mergedArray.push({ ...item });
      }
    }

    const mergedUsers = users.map(user => {
      const mergedItem = mergedArray.find(item => item.phone === user.phone);
      return {
        ...user,
        betbet: mergedItem ? mergedItem.money : 0
      };
    });
    return res.status(200).json({
      message: "Nhận thành công",
      datas: mergedUsers,
      status: true,
      timeStamp: timeNow,
    });
  } else if (userInfo.level == 2) {

    let userSearch;
    let [userPhone] = await connection.query(
        `SELECT * FROM users WHERE phone = ? ORDER BY id DESC `,
        [phone]
    );
    let [userIds] = await connection.query(
        `SELECT * FROM users WHERE id_user = ? ORDER BY id DESC `,
        [phone]
    );
    if (userPhone.length === 0) {
      userSearch = [userIds]
    } else {
      userSearch = [userPhone];
    }
    const [users] = userSearch;
    if (users.length == 0) {
      return res.status(200).json({
        message: "Nhận thành công",
        datas: [],
        status: true,
        timeStamp: timeNow,
      });
    } else {
      if (users[0].ctv == userInfo.phone) {

        const resultsk3 = [];
        for (const user of users) {
          const [result] = await connection.query(`SELECT SUM(money) AS money FROM result_k3 WHERE phone = ?`, [user.phone]);
          resultsk3.push({phone: user.phone, money: result[0].money || 0});
        }
        const resultsd5 = [];
        for (const user of users) {
          const [result] = await connection.query(`SELECT SUM(money) AS money FROM result_5d WHERE phone = ?`, [user.phone]);
          resultsd5.push({phone: user.phone, money: result[0].money || 0});
        }
        const resultsm1 = [];
        for (const user of users) {
          const [result] = await connection.query(`SELECT SUM(money) AS money FROM minutes_1 WHERE phone = ?`, [user.phone]);
          resultsm1.push({phone: user.phone, money: result[0].money || 0});
        }

        const mergedArray = [];
        for (const item of resultsk3) {
          const existingItem = mergedArray.find((el) => el.phone === item.phone);
          if (existingItem) {
            existingItem.money = Number(existingItem.money) +Number(item.money);
          } else {
            mergedArray.push({ ...item });
          }
        }

        for (const item of resultsd5) {
          const existingItem = mergedArray.find((el) => el.phone === item.phone);
          if (existingItem) {
            existingItem.money = Number(existingItem.money) +Number(item.money);
          } else {
            mergedArray.push({ ...item });
          }
        }

        for (const item of resultsm1) {
          const existingItem = mergedArray.find((el) => el.phone === item.phone);
          if (existingItem) {
            existingItem.money = Number(existingItem.money) +Number(item.money);
          } else {
            mergedArray.push({ ...item });
          }
        }

        const mergedUsers = users.map(user => {
          const mergedItem = mergedArray.find(item => item.phone === user.phone);
          return {
            ...user,
            betbet: mergedItem ? mergedItem.money : 0
          };
        });
        return res.status(200).json({
          message: "Nhận thành công",
          datas: mergedUsers,
          status: true,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Failed",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listWithdraw = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [recharge] = await connection.query(
    "SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Nhận thành công",
    datas: recharge,
    status: true,
    timeStamp: timeNow,
  });
};

const useRedenvelope = async (req, res) => {
  let auth = req.cookies.auth;
  let code = req.body.code;
  if (!auth || !code) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
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
  const [redenvelopes] = await connection.query(
    "SELECT * FROM redenvelopes WHERE id_redenvelope = ?",
    [code]
  );

  if (redenvelopes.length == 0) {
    return res.status(200).json({
      message: "Lỗi mã đổi thưởng",
      status: false,
      timeStamp: timeNow,
    });
  } else {
    let infoRe = redenvelopes[0];
    const d = new Date();
    const time = d.getTime();
    if (infoRe.status == 0) {
      await connection.query(
        "UPDATE redenvelopes SET used = ?, status = ? WHERE `id_redenvelope` = ? ",
        [0, 1, infoRe.id_redenvelope]
      );
      await connection.query(
        "UPDATE users SET money = money + ? WHERE `phone` = ? ",
        [infoRe.money, userInfo.phone]
      );
      let sql =
        "INSERT INTO redenvelopes_used SET phone = ?, phone_used = ?, id_redenvelops = ?, money = ?, `time` = ? ";
      await connection.query(sql, [
        infoRe.phone,
        userInfo.phone,
        infoRe.id_redenvelope,
        infoRe.money,
        time,
      ]);
      return res.status(200).json({
        message: `Nhận thành công +${infoRe.money}`,
        status: true,
        timeStamp: timeNow,
      });
    } else {
      return res.status(200).json({
        message: "Mã quà đã được sử dụng",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
};

const callback_bank = async (req, res) => {
  let transaction_id = req.body.transaction_id;
  let client_transaction_id = req.body.client_transaction_id;
  let amount = req.body.amount;
  let requested_datetime = req.body.requested_datetime;
  let expired_datetime = req.body.expired_datetime;
  let payment_datetime = req.body.payment_datetime;
  let status = req.body.status;
  if (!transaction_id) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  if (status == 2) {
    await connection.query(
      `UPDATE recharge SET status = 1 WHERE id_order = ?`,
      [client_transaction_id]
    );
    const [info] = await connection.query(
      `SELECT * FROM recharge WHERE id_order = ?`,
      [client_transaction_id]
    );
    await connection.query(
      "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ",
      [info[0].money, info[0].money, info[0].phone]
    );
    return res.status(200).json({
      message: 0,
      status: true,
    });
  } else {
    await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

    return res.status(200).json({
      message: "Hủy đơn thành công",
      status: true,
      datas: recharge,
    });
  }
};

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

function timerJoinFull(params = "") {
  let date = "";
  if (params) {
    date = new Date(Number(params));
  } else {
    date = new Date();
  }
  let years = formateT(date.getFullYear());
  let months = formateT(date.getMonth() + 1);
  let days = formateT(date.getDate());

  let hours = formateT(date.getHours());
  let minutes = formateT(date.getMinutes());
  let seconds = formateT(date.getSeconds());
  return (years + "-" + months + "-" + days + " " + hours + ":" + minutes + ":" + seconds);
}
function caculateFirstRechageRose(amount) {
  let hoahong = 0;
  if(amount >= 50000 && amount < 100000){
    hoahong = 18000;
  }else if(amount >= 100000 && amount < 300000){
    hoahong = 38000;
  }else if(amount >= 300000 && amount < 500000){
    hoahong = 78000;
  }else if(amount >= 500000 && amount < 1000000){
    hoahong = 138000;
  }else if(amount >= 1000000 && amount < 3000000){
    hoahong = 238000;
  }else if(amount >= 3000000 && amount < 5000000){
    hoahong = 398000;
  }else if(amount >= 5000000 && amount < 10000000){
    hoahong = 680000;
  }else if(amount >= 10000000 && amount < 30000000){
    hoahong = 1268000;
  }else if(amount >= 30000000 && amount < 60000000){
    hoahong = 3600000;
  }else if(amount >= 60000000 && amount < 100000000){
    hoahong = 6800000;
  }else if(amount >= 100000000 && amount < 500000000){
    hoahong = 10000000;
  }else if(amount >= 500000000){
    hoahong = 60000000;
  }
  return hoahong;
}
const getAllTransactionHistory = async (req, res) => {
  let auth = req.cookies.auth;
  let date = req.body.selectedDate;
  let today = convertDateFormat(date);
  let typeid = req.body.typeid;
  const [user] = await connection.query("SELECT * FROM users WHERE `token` = ? ", [auth]);
  if (user.length == 0) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let {pageno, limit } = req.body;
  if (!pageno || !limit) {
    return res.status(200).json({
      code: 0,
      msg: "Không còn dữ liệu",
      data: {
        gameslist: [],
      },
      status: false
    });
  }
  let userInfo = user[0];
  let datas = [];
  if (typeid === "all") {
    // Thuong F1 Nap dau
    const [f1s] = await connection.query("SELECT `phone`, `code`,`invite`, `time`, `status`, `money` as surplus, `total_money` as total_amount FROM users WHERE `invite` = ?", userInfo.code);
    let f1Phones = f1s.map(row => row.phone).filter(phone => phone !== '');
    let firstF1RechargeToday = [];
    for (let i in f1Phones) {
      let phone = f1Phones[i];
      let firstOrderId = '';
      const [firstRecharge] = await connection.query("SELECT `phone`, `money`, `today`, `time`, `id_order` FROM recharge WHERE `status` = 1 AND `phone` = ? ORDER BY `time` ASC LIMIT 1", [phone]);
      if (firstRecharge && firstRecharge[0] && firstRecharge[0].money !== undefined) {
        firstOrderId = firstRecharge[0].id_order;
      }
      if(firstOrderId !== '') {
        const [firstRechargeToday] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM recharge WHERE `status` = 1 AND `phone` = ? AND `today` = ? AND id_order = ? ORDER BY `time` ASC", [phone, today, firstOrderId]);
        if (firstRechargeToday && firstRechargeToday[0] && firstRechargeToday[0].money !== undefined ) {
          firstRecharge[0].timestamp = timerJoinFull(firstRecharge[0].time);
          firstRecharge[0].detail = "Thưởng F1 nạp đầu";
          firstRecharge[0].status = 1;
          firstRecharge[0].money = caculateFirstRechageRose(firstRecharge[0].money);
          firstF1RechargeToday.push(firstRecharge[0]);
        }
      }
    }
    // Nạp tiền
    const [recharges] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM recharge WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in recharges) {
      recharges[i].timestamp = timerJoinFull(recharges[i].time);
      recharges[i].detail = "Nạp tiền";
      recharges[i].status = 1;
    }

    // Rút tiền
    const [withdrawals] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM withdraw WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in withdrawals) {
      withdrawals[i].timestamp = timerJoinFull(withdrawals[i].time);
      withdrawals[i].detail = "Rút tiền";
      withdrawals[i].status = 2;
    }

    // Wingo
    const [wingos] = await connection.query("SELECT `phone`, `money`, `fee`, `today`, `time` FROM minutes_1 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in wingos) {
      wingos[i].timestamp = timerJoinFull(wingos[i].time);
      wingos[i].money = Number(wingos[i].money) + Number(wingos[i].fee);
      wingos[i].detail = "Cược game Wingo";
      wingos[i].status = 2;
    }

    // K3
    const [k3s] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM result_k3 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in k3s) {
      k3s[i].timestamp = timerJoinFull(k3s[i].time);
      k3s[i].detail = "Cược game K3";
      k3s[i].status = 2;
    }

    // 5d
    const [d5s] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM result_5d WHERE  `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in d5s) {
      d5s[i].timestamp = timerJoinFull(d5s[i].time);
      d5s[i].detail = "Cược game 5D";
      d5s[i].status = 2;
    }
    // cộng tiền so du
    const [addFunds] = await connection.query("SELECT `phone`, `money`, `description`, `today`, `time`, `status` FROM additional_money WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in addFunds) {
      addFunds[i].timestamp = timerJoinFull(addFunds[i].time);
      addFunds[i].detail = `Cộng tiền số dư - ${addFunds[i].description}`;
    }
    datas = recharges
        .concat(withdrawals, wingos, k3s, d5s, firstF1RechargeToday, addFunds)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else if (typeid === "f1fr") {
    const [f1s] = await connection.query("SELECT `phone`, `code`,`invite`, `time`, `status`, `money` as surplus, `total_money` as total_amount FROM users WHERE `invite` = ?", userInfo.code);
    let f1Phones = f1s.map(row => row.phone).filter(phone => phone !== '');
    let firstF1RechargeToday = [];
    for (let i in f1Phones) {
      let phone = f1Phones[i];
      const [firstRecharge] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM recharge WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` ASC", [phone, today]);
      if (firstRecharge && firstRecharge[0] && firstRecharge[0].money !== undefined) {
        firstRecharge[0].timestamp = timerJoinFull(firstRecharge[0].time);
        firstRecharge[0].detail = "Thưởng F1 nạp đầu";
        firstRecharge[0].status = 1;
        firstRecharge[0].money = caculateFirstRechageRose(firstRecharge[0].money);
        firstF1RechargeToday.push(firstRecharge[0]);
      }
    }
    datas = firstF1RechargeToday;
  } else if (typeid === "rech") {
    const [recharges] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM recharge WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in recharges) {
      recharges[i].timestamp = timerJoinFull(recharges[i].time);
      recharges[i].detail = "Nạp tiền";
      recharges[i].status = 1;
    }
    datas = recharges;
  } else if (typeid === "with") {
    const [withdrawals] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM withdraw WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in withdrawals) {
      withdrawals[i].timestamp = timerJoinFull(withdrawals[i].time);
      withdrawals[i].detail = "Rút tiền";
      withdrawals[i].status = 2;
    }
    datas = withdrawals;
  } else if (typeid === "cgwg") {
    const [wingos] = await connection.query("SELECT `phone`, `money`, `fee`, `today`, `time` FROM minutes_1 WHERE  `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in wingos) {
      wingos[i].timestamp = timerJoinFull(wingos[i].time);
      wingos[i].money = Number(wingos[i].money) + Number(wingos[i].fee);
      wingos[i].detail = "Cược game Wingo";
      wingos[i].status = 2;
    }
    datas = wingos;
  } else if (typeid === "cgk3") {
    const [k3s] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM result_k3 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in k3s) {
      k3s[i].timestamp = timerJoinFull(k3s[i].time);
      k3s[i].detail = "Cược game K3";
      k3s[i].status = 2;
    }
    datas = k3s;
  } else if (typeid === "cg5d") {
    const [d5s] = await connection.query("SELECT `phone`, `money`, `today`, `time` FROM result_5d WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in d5s) {
      d5s[i].timestamp = timerJoinFull(d5s[i].time);
      d5s[i].detail = "Cược game 5D";
      d5s[i].status = 2;
    }
    datas = d5s;
  } else if (typeid === "tcwg") {
    const [wingos] = await connection.query("SELECT `phone`, `money`, `fee`, `today`, `time`, `get` FROM minutes_1 WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in wingos) {
      wingos[i].timestamp = timerJoinFull(wingos[i].time);
      wingos[i].money = Number(wingos[i].money) + Number(wingos[i].fee);
      wingos[i].detail = "Thắng cược game Wingo";
      wingos[i].status = 1;
      wingos[i].money = wingos[i].get;
    }
    datas = wingos;
  } else if (typeid === "tck3") {
    const [k3s] = await connection.query("SELECT `phone`, `money`, `today`, `time`, `get` FROM result_k3 WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in k3s) {
      k3s[i].timestamp = timerJoinFull(k3s[i].time);
      k3s[i].detail = "Thắng cược game K3";
      k3s[i].status = 1;
      k3s[i].money = k3s[i].get;
    }
    datas = k3s;
  } else if (typeid === "tc5d") {
    const [d5s] = await connection.query("SELECT `phone`, `money`, `today`, `time`, `get` FROM result_5d WHERE `status` = 1 AND `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in d5s) {
      d5s[i].timestamp = timerJoinFull(d5s[i].time);
      d5s[i].detail = "Thắng cược game 5D";
      d5s[i].status = 1;
      d5s[i].money = d5s[i].get;
    }
    datas = d5s;
  } else if (typeid === "ctsd") {
    const [addFunds] = await connection.query("SELECT `phone`, `money`, `description`, `today`, `time`, `status` FROM additional_money WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in addFunds) {
      addFunds[i].timestamp = timerJoinFull(addFunds[i].time);
      addFunds[i].detail = `Cộng tiền số dư - ${addFunds[i].description}`;
    }
    datas = addFunds;
  } else {
    // do nothing
  }

  const startIndex = Math.max((pageno - 1) * limit, 0);
  const endIndex = Number(startIndex) + Number(limit);
  let datasPage = datas.slice(startIndex, endIndex);

  return res.status(200).json({
    message: "Lấy lịch sử giao dịch thành công",
    status: true,
    data: datasPage,
    total: datas.length,
    page_total: Math.ceil(datas.length / limit)
  });
};

const getWithdrawalHistoryByDate = async (req, res) => {
  let auth = req.cookies.auth;
  let date = req.body.selectedDate;
  let typeid = req.body.typeid;
  let today = convertDateFormat(date);
  const [user] = await connection.query("SELECT * FROM users WHERE `token` = ? ", [auth]);
  if (user.length == 0) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let {pageno, limit } = req.body;
  if (!pageno || !limit) {
    return res.status(200).json({
      code: 0,
      msg: "Không còn dữ liệu",
      data: {
        gameslist: [],
      },
      status: false
    });
  }
  let userInfo = user[0];
  let withdrawals = [];
  if(date === "") {
    if(typeid === 'all') {
      [withdrawals] = await connection.query("SELECT * FROM withdraw WHERE `phone` = ? ORDER BY `time` DESC ", [userInfo.phone]);
    } else {
      [withdrawals] = await connection.query("SELECT * FROM withdraw WHERE `phone` = ? AND `status` = ? ORDER BY `time` DESC ", [userInfo.phone, typeid]);
    }
  } else {
    if(typeid === 'all') {
      [withdrawals] = await connection.query("SELECT * FROM withdraw WHERE `phone` = ? AND `today` = ?  ORDER BY `time` DESC ", [userInfo.phone, today]);
    } else {
      [withdrawals] = await connection.query("SELECT * FROM withdraw WHERE `phone` = ? AND `status` = ? AND `today` = ?  ORDER BY `time` DESC ", [userInfo.phone, typeid, today]);
    }
  }

  for (let i in withdrawals) {
    withdrawals[i].timestamp = timerJoinFull(withdrawals[i].time);
    withdrawals[i].detail = "Rút tiền";
  }
  const startIndex = Math.max((pageno - 1) * limit, 0);
  const endIndex = Number(startIndex) + Number(limit);
  let withdrawalsPage = withdrawals.slice(startIndex, endIndex);
  return res.status(200).json({
    message: "Lấy lịch sử rút tiền thành công",
    status: true,
    withdrawals_total: withdrawals.length,
    data: withdrawalsPage,
    page_total: Math.ceil(withdrawals.length / limit)
  });
};

const getRechargeHistoryByDate = async (req, res) => {
  let auth = req.cookies.auth;
  let date = req.body.selectedDate;
  let typeid = req.body.typeid;
  let today = convertDateFormat(date);
  const [user] = await connection.query("SELECT * FROM users WHERE `token` = ? ", [auth]);
  if (user.length == 0) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let {pageno, limit } = req.body;
  if (!pageno || !limit) {
    return res.status(200).json({
      code: 0,
      msg: "Không còn dữ liệu",
      data: {
        gameslist: [],
      },
      status: false
    });
  }
  let userInfo = user[0];
  let recharges = [];
  if(typeid === 'all') {
    [recharges] = await connection.query("SELECT * FROM recharge WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC ", [userInfo.phone, today]);
  } else {
    [recharges] = await connection.query("SELECT * FROM recharge WHERE `phone` = ? AND `status` = ? AND `today` = ? ORDER BY `time` DESC ", [userInfo.phone, typeid, today]);
  }
  for (let i in recharges) {
    recharges[i].timestamp = timerJoinFull(recharges[i].time);
    recharges[i].detail = "Nạp tiền";
  }
  const startIndex = Math.max((pageno - 1) * limit, 0);
  const endIndex = Number(startIndex) + Number(limit);
  let rechargesPage = recharges.slice(startIndex, endIndex);
  return res.status(200).json({
    message: "Lấy lịch sử rút tiền thành công",
    status: true,
    recharges_total: recharges.length,
    data: rechargesPage,
    page_total: Math.ceil(recharges.length / limit)
  });
};

function getGameType(game, name) {
  let response = "";
  if(game === 1 || game === '1' || game === 'wingo') {
    response = name.toString().toUpperCase() + " 1 Phút"
  } else if (game === 3 || game === '3' || game === 'wingo3') {
    response = name.toString().toUpperCase() + " 3 Phút"
  } else if (game === 5 || game === '5'   || game === 'wingo5') {
    response = name.toString().toUpperCase() + " 5 Phút"
  } else if (game === 10 || game === '10'  || game === 'wingo10') {
    response = name.toString().toUpperCase() + " 10 Phút"
  } else {
    //do nothing
  }
  return response
};

const getAllBetHistory = async (req, res) => {
  let auth = req.cookies.auth;
  let date = req.body.selectedDate;
  let typeid = req.body.typeid;
  let today = convertDateFormat(date);
  const [user] = await connection.query("SELECT * FROM users WHERE `token` = ? ", [auth]);
  if (user.length == 0) {
    return res.status(200).json({
      message: "Tài khoản không tồn tại",
      status: false,
      timeStamp: timeNow,
    });
  }
  let {pageno, limit } = req.body;
  if (!pageno || !limit) {
    return res.status(200).json({
      code: 0,
      msg: "Không còn dữ liệu",
      data: {
        gameslist: [],
      },
      status: false
    });
  }
  let userInfo = user[0];

  let datas = [];
  if (typeid === "all") {
    const [wingos] = await connection.query("SELECT * FROM minutes_1 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in wingos) {
      wingos[i].timestamp = timerJoinFull(wingos[i].time);
      wingos[i].price = Number(wingos[i].money);
      wingos[i].money = Number(wingos[i].money) + Number(wingos[i].fee);
      wingos[i].detail = "Cược game Wingo";
      wingos[i].profit = Number(wingos[i].get) - Number(wingos[i].money);
      wingos[i].type = getGameType(wingos[i].game, "WINGO")
    }
    const [k3s] = await connection.query("SELECT * FROM result_k3 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in k3s) {
      k3s[i].timestamp = timerJoinFull(k3s[i].time);
      k3s[i].detail = "Cược game K3";
      k3s[i].profit = Number(k3s[i].get) - Number(k3s[i].money);
      console.log("k3s[i].game", k3s[i].game)
      k3s[i].type = getGameType(k3s[i].game, "K3")
    }
    const [d5s] = await connection.query("SELECT * FROM result_5d WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in d5s) {
      d5s[i].timestamp = timerJoinFull(d5s[i].time);
      d5s[i].detail = "Cược game 5D";
      d5s[i].profit = Number(d5s[i].get) - Number(d5s[i].money);
      d5s[i].type = getGameType(d5s[i].game, "5D")
    }
    datas = wingos.concat(k3s, d5s).sort((a, b) => new Date(b.time) - new Date(a.time));
  } else if (typeid === 'wingo') {
    const [wingos] = await connection.query("SELECT * FROM minutes_1 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in wingos) {
      wingos[i].timestamp = timerJoinFull(wingos[i].time);
      wingos[i].money = Number(wingos[i].money) + Number(wingos[i].fee);
      wingos[i].detail = "Cược game Wingo";
      wingos[i].profit = Number(wingos[i].get) - Number(wingos[i].money) - Number(wingos[i].fee);
      wingos[i].type = getGameType(wingos[i].game, "WINGO")
    }
    datas = wingos;
  } else if (typeid === 'k3') {
    const [k3s] = await connection.query("SELECT * FROM result_k3 WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in k3s) {
      k3s[i].timestamp = timerJoinFull(k3s[i].time);
      k3s[i].detail = "Cược game K3";
      k3s[i].profit = Number(k3s[i].get) - Number(k3s[i].money);
      console.log("k3s[i].game", k3s[i].game)
      k3s[i].type = getGameType(k3s[i].game, "K3")
    }
    datas = k3s;
  } else {
    // 5d
    const [d5s] = await connection.query("SELECT * FROM result_5d WHERE `phone` = ? AND `today` = ? ORDER BY `time` DESC", [userInfo.phone, today]);
    for (let i in d5s) {
      d5s[i].timestamp = timerJoinFull(d5s[i].time);
      d5s[i].detail = "Cược game 5D";
      d5s[i].profit = Number(d5s[i].get) - Number(d5s[i].money);
      d5s[i].type = getGameType(d5s[i].game, "5D")
    }
    datas = d5s;
  }
  const startIndex = Math.max((pageno - 1) * limit, 0);
  const endIndex = Number(startIndex) + Number(limit);
  let datasPage = datas.slice(startIndex, endIndex);

  return res.status(200).json({
    message: "Lấy lịch sử giao dịch thành công",
    status: true,
    data: datasPage,
    total: datas.length,
    page_total: Math.ceil(datas.length / limit)
  });
};

const handleCallBackRecharge = async (req, res) => {
  let dataHandle = JSON.parse(req.body.data);
  // let qrUrl = req.body.qrurl;
  let phone = dataHandle.userid;
  let orderId = dataHandle.orderid;
  // let success = req.body.success;
  let sign = dataHandle.sign;
  let isPay = dataHandle.ispay;
  let payAmount = dataHandle.payamount;
  console.log("Call back for url bet auto");
  console.log("phone", phone);
  console.log("orderId", orderId);
  console.log("sign", sign);
  console.log("isPay", isPay);
  console.log("payAmount", payAmount);

  //Validate recharge by id_order
  let info = [];
  if(orderId !== ''){
    [info] = await connection.query(`SELECT * FROM recharge WHERE id_order = ?`, [orderId]);
  }

  let calcSign = "";
  if(info.length > 0) {
    const { MD5 } = require("crypto-js");
    let amount = info[0].money.toFixed(4);
    let token = "n15kfj7vbnln9z1z4jtq7z62qfx8br0g";
    let caclStr = token+info[0].id_order.toString()+amount.toString();
    calcSign = MD5(caclStr.toLowerCase());
    console.log("calcSign", calcSign.toString().toLowerCase());

    console.log(info[0].money);
    if (isPay === 1 && payAmount === info[0].money.toFixed(4)
        && calcSign.toString().toLowerCase() === sign.toLowerCase()
        && info[0].status.toString() === '0') {

      await connection.query(`UPDATE recharge SET status = 1 WHERE id_order = ?`, [orderId]);
      try {
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [ info[0].money, info[0].money, info[0].phone ]);
      } catch (error) {
        console.log(error);
      }

      const [invite] = await connection.query('SELECT `invite`, `code` FROM `users` WHERE `phone`= ? LIMIT 1', [info[0].phone]);
      const [ctv] = await connection.query('SELECT `phone`, `code` FROM `users` WHERE `code`= ? LIMIT 1', [invite[0].invite]);
      const [check] = await connection.query('SELECT `napdau` FROM `users` WHERE `phone`= ?', [info[0].phone]);
      const amount = info[0].money;

      if (check[0].napdau == 0) {
        var time = new Date().getTime();
        //thuc hien cong tien nap dau tien cho nguoi gioi thieu
        var hoahong = 0;
        if(amount >= 50000 && amount < 100000){
          hoahong = 18000;
        }else if(amount >= 100000 && amount < 300000){
          hoahong = 38000;
        }else if(amount >= 300000 && amount < 500000){
          hoahong = 78000;
        }else if(amount >= 500000 && amount < 1000000){
          hoahong = 138000;
        }else if(amount >= 1000000 && amount < 3000000){
          hoahong = 238000;
        }else if(amount >= 3000000 && amount < 5000000){
          hoahong = 398000;
        }else if(amount >= 5000000 && amount < 10000000){
          hoahong = 680000;
        }else if(amount >= 10000000 && amount < 30000000){
          hoahong = 1268000;
        }else if(amount >= 30000000 && amount < 60000000){
          hoahong = 3600000;
        }else if(amount >= 60000000 && amount < 100000000){
          hoahong = 6800000;
        }else if(amount >= 100000000 && amount < 500000000){
          hoahong = 10000000;
        }else if(amount >= 500000000){
          hoahong = 60000000;
        }

        await connection.query(`UPDATE users SET money = money + ?, total_money = total_money + ?, roses_today = roses_today + ?, roses_f = roses_f + ? WHERE phone = ? `, [hoahong, hoahong, hoahong, hoahong, ctv[0]?.phone]);
        let sql = 'INSERT INTO `roses` SET `phone` = ?, `f1` = ?, `code` = ?, `invite` = ?, `time` = ?, `chitiet` = ?';
        await connection.query(sql, [info[0].phone, hoahong, invite[0].code, ctv[0].code, time, 'Nạp Tiền']);
        await connection.query(`UPDATE users SET napdau = 1 WHERE phone = ?`, [ info[0].phone ]);
      }
      await connection.query(`UPDATE users SET tongcuoc = tongcuoc + ? WHERE phone = ?`, [ Number(info[0].money), info[0].phone ]);

      const updatedMoney = info[0].money * 0.03; // Cộng thêm 3%
      await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [ updatedMoney, updatedMoney, info[0].phone ]);
    }
  }
  return res.status(200).json({
    message: "success",
    msg: "success",
    status: true,
  });
};

const handleCallBackWithdrawal = async (req, res) => {
  console.log("req.body.data", req.body.data);
  let dataHandle = JSON.parse(req.body.data);
  // let qrUrl = req.body.qrurl;
  let phone = dataHandle.userid;
  let orderId = dataHandle.orderid;
  // let success = req.body.success;
  let sign = dataHandle.sign;
  let isPay = dataHandle.ispay;
  let isCancel = dataHandle.iscancel;
  let payAmount = dataHandle.payamount;
  console.log("Call handleCallBackWithdrawal for url bet auto");

  console.log("phone", phone)
  console.log("orderId", orderId)
  console.log("sign", sign)
  console.log("isPay", isPay)
  console.log("isCancel", isCancel)
  console.log("payAmount", payAmount)

  //Validate recharge by id_order
  let info = [];
  if(orderId !== ''){
    [info] = await connection.query(`SELECT * FROM withdraw WHERE id_order = ?`, [orderId]);
  }
  console.log("info", info[0])
  let calcSign = "";
  if(info.length > 0) {
    const { MD5 } = require("crypto-js");
    let amount = info[0].money.toFixed(4);
    let token = "n15kfj7vbnln9z1z4jtq7z62qfx8br0g";
    let caclStr = token+info[0].id_order.toString()+amount.toString();
    calcSign = MD5(caclStr.toLowerCase());
    console.log("calcSign", calcSign.toString())
    if (isPay === 1 && payAmount === info[0].money.toFixed(4)
        && calcSign.toString().toLowerCase() === sign.toLowerCase()
        && info[0].status.toString() === '4') {
      console.log("Da vao rut");
      await connection.query(`UPDATE withdraw SET status = 1 WHERE id_order = ?`, [orderId]);
    }
    if (isCancel === 1 && payAmount === info[0].money.toFixed(4)
        && calcSign.toString().toLowerCase() === sign.toLowerCase()
        && info[0].status.toString() === '4') {
      console.log("Da vao huy rut");
      await connection.query(`UPDATE withdraw SET status = 2 WHERE id_order = ?`, [orderId]);
      const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE id_order = ?`, [orderId]);
      await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [withdraw[0].money, withdraw[0].phone]);
    }
  }
  return res.status(200).json({
    message: "success",
    msg: "success",
    status: true,
  });
};

module.exports = {
  userInfo,
  changeUser,
  promotion,
  myTeam,
  recharge,
  recharge2,
  listRecharge,
  listWithdraw,
  changePassword,
  checkInHandling,
  infoUserBank,
  addBank,
  editBank,
  withdrawal3,
  callback_bank,
  listMyTeam,
  verifyCode,
  useRedenvelope,
  search,
  getAllTransactionHistory,
  getWithdrawalHistoryByDate,
  getRechargeHistoryByDate,
  getAllBetHistory,
  handleCallBackRecharge,
  handleCallBackWithdrawal
};
