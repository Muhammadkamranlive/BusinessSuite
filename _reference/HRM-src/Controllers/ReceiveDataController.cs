using itgsgroup.Areas.Identity.Data;
using itgsgroup.Hub;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Identity;
using Microsoft.CodeAnalysis;

namespace itgsgroup.Controllers
{
    [Route("a/[controller]")]
    //[ApiController]
    public class ReceiveDataController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHubContext<DataHub> _hubContext;

        public ReceiveDataController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, IHubContext<DataHub> hubContext)
        {
            _context = context;
            _userManager = userManager;
            _hubContext = hubContext;
        }

        [HttpPost("ReceiveData")]
        public IActionResult ReceiveData([FromBody] DataReceived data)
        {
            ProcessReceivedDataAsync(data);
            return Ok("Data received successfully");
        }
        [HttpPost("ReceiveToDayData")]
        public IActionResult ReceiveToDayData([FromBody] ICollection<ToDayDataReceived> lstMachineInfo)
        {
            try
            {
                var attendanceData = lstMachineInfo.Where(c => c.DateOnlyRecord.Date == DateTime.Now.Date);
                if (attendanceData != null)
                {
                    foreach (var attData in attendanceData)
                    {
                        var userId = _userManager.Users
                        .Where(u => u.machineId == attData.IndRegID && u.status == "Active")
                        .Select(u => u.Id)
                        .FirstOrDefault();

                        if (userId != null)
                        {
                            string string_attstate = "";
                            if (attData.AttState == 0 || attData.AttState == 1)
                            {
                                int int_attstate = attData.AttState + 4;
                                string_attstate = int_attstate.ToString();
                            }
                            else
                            {
                                string_attstate = attData.AttState.ToString();
                            }
//                            var rawatt = _context.rawattendances.FirstOrDefault();
  //                          if (string_attstate == "4")
    //                        {
                               var  rawatt = _context.rawattendances.Where(c => c.empId == userId
&& c.att_datetime.Date == attData.DateOnlyRecord.Date
&& c.AttState == string_attstate).FirstOrDefault();
      //                      }
        //                    else if(string_attstate == "5")
          //                  {
            //                    rawatt = _context.rawattendances.Where(c => c.empId == userId
//&& c.att_datetime.Date == attData.DateOnlyRecord.Date
//&& c.AttState == string_attstate).OrderByDescending(c => c.att_datetime).FirstOrDefault();
  //                          }

                            if (rawatt is null)
                            {
                                var rawattendance = new rawattendanceModel
                                {
                                    empId = userId,
                                    att_datetime = DateTime.Parse(attData.DateTimeRecord),
                                    AttState = string_attstate,
                                };

                                _context.rawattendances.Add(rawattendance);
                                _context.SaveChanges();
                            }
                          /*  else
                            {
                                rawatt.att_datetime = DateTime.Parse(attData.DateTimeRecord);
                                rawatt.AttState = string_attstate;

                                _context.rawattendances.Update(rawatt);
                                _context.SaveChanges();

                            }
                            */
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return Ok("Data received failed");
            }
            return Ok("Data received successfully");
         /*   try
            {
                var machinenumber = lstMachineInfo.Select(c => c.MachineNumber).FirstOrDefault();
                if (machinenumber == 1)
                {
                    var rawattModels = _context.rawattendances
        .Where(c => c.att_datetime.Date == DateTime.Now.Date && c.emp.companyId == 2)
        .ToList();


                    if (rawattModels != null && rawattModels.Any())
                    {
                        _context.rawattendances.RemoveRange(rawattModels);

                        _context.SaveChanges();
                    }
                }
                else if (machinenumber == 2)
                {
					var rawattModels = _context.rawattendances
.Where(c => c.att_datetime.Date == DateTime.Now.Date && c.emp.companyId == 5)
.ToList();


					if (rawattModels != null && rawattModels.Any())
					{
						_context.rawattendances.RemoveRange(rawattModels);

						_context.SaveChanges();
					}

				}
				else if (machinenumber == 3)
				{
					var rawattModels = _context.rawattendances
.Where(c => c.att_datetime.Date == DateTime.Now.Date && c.emp.companyId == 6)
.ToList();


					if (rawattModels != null && rawattModels.Any())
					{
						_context.rawattendances.RemoveRange(rawattModels);

						_context.SaveChanges();
					}

				}
				var attendanceData = lstMachineInfo.Where(c => c.DateOnlyRecord.Date == DateTime.Now.Date);
                if (attendanceData != null)
                {
                    foreach (var attData in attendanceData)
                    {
                        var userId = _userManager.Users
                        .Where(u => u.machineId == attData.IndRegID)
                        .Select(u => u.Id)
                        .FirstOrDefault();

                        if (userId != null)
                        {
                            string string_attstate = "";
                            if (attData.AttState == 0 || attData.AttState == 1) {
                                int int_attstate = attData.AttState + 4;
                                string_attstate = int_attstate.ToString();
                            }
                            else
                            {
                                string_attstate = attData.AttState.ToString();
                            }
                            var rawattendance = new rawattendanceModel
                            {
                                empId = userId,
                                att_datetime = DateTime.Parse(attData.DateTimeRecord),
                                AttState = string_attstate,
                            };

                            _context.rawattendances.Add(rawattendance);
                            _context.SaveChanges();
                        }
                        else
                        {
                        }
                    }
                }
                else
                {
                }

            }
            catch (Exception ex)
            {
                return Ok("Data received failed");
            }
            return Ok("Data received successfully"); */
        }

        private IActionResult ProcessReceivedDataAsync(DataReceived data)
        {
            try
            {
                var attendanceData = data;
                if (attendanceData != null)
                {
                    int machineId;
                    if (int.TryParse(attendanceData.machineId, out machineId))
                    {
                        var userId = _userManager.Users
                        .Where(u => u.machineId == machineId && u.status == "Active")
                        .Select(u => u.Id)
                        .FirstOrDefault();

                        if (userId != null)
                        {
                            string string_attstate = "";
                            if (attendanceData.attState == "0" || attendanceData.attState == "1")
                            {
                                int int_attstate = int.Parse(attendanceData.attState) + 4;
                                string_attstate = int_attstate.ToString();
                            }
                            else
                            {
                                string_attstate = attendanceData.attState;
                            }


                            var rawattendance = new rawattendanceModel
                            {
                                empId = userId,
                                att_datetime = DateTime.Parse(attendanceData.att_datetime),
                                AttState = string_attstate,
                            };

                            _context.rawattendances.Add(rawattendance);
                            _context.SaveChanges();
                             return Ok("Data received and saved successfully");
                        }
                        else
                        {
                        }
                    }
                    else
                    {
                    }
                }
                
            }
            catch (Exception ex)
            {

            }
                return Ok("Data received successfully");
        }
    }
}
