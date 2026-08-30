// TimeService.cs
using System;
using Microsoft.EntityFrameworkCore;
using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;

public interface ITimeService
{
	DateTime GetCurrentTimeInPakistan();
}

public class TimeService : ITimeService
{
	private readonly ApplicationDbContext _context;

	public TimeService(ApplicationDbContext context)
	{
		_context = context;
	}

	public DateTime GetCurrentTimeInPakistan()
	{
		var query = "SELECT cast(SYSDATETIMEOFFSET() AT TIME ZONE 'Pakistan Standard Time' as datetime) AS CurrentTimeInPST";

		var currentTimeInPST = _context.getPakTime.FromSqlRaw<GetPakTime>(query).FirstOrDefault()?.CurrentTimeInPST;

		return currentTimeInPST ?? DateTime.MinValue;
	}
}

