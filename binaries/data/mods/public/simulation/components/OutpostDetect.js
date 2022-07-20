// Number of rounds of firing per 2 seconds.
const roundCount = 10;
const attackType = "Ranged";

function OutpostDetect() {}

OutpostDetect.prototype.Schema =
	"<element name='DefaultArrowCount'>" +
		"<data type='nonNegativeInteger'/>" +
	"</element>";

OutpostDetect.prototype.MAX_PREFERENCE_BONUS = 2;

OutpostDetect.prototype.Init = function() //1
{
	this.currentRound = 0;
	this.archersGarrisoned = 0;
	this.arrowsLeft = 0;
	this.targetUnits = [];
};

OutpostDetect.prototype.OnGarrisonedUnitsChanged = function(msg) //2
{
	let classes = this.template.GarrisonArrowClasses;
	for (let ent of msg.added)
	{
		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		if (cmpIdentity && MatchesClassList(cmpIdentity.GetClassesList(), classes))
			++this.archersGarrisoned;
	}
	for (let ent of msg.removed)
	{
		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		if (cmpIdentity && MatchesClassList(cmpIdentity.GetClassesList(), classes))
			--this.archersGarrisoned;
	}
};

OutpostDetect.prototype.OnOwnershipChanged = function(msg) //3
{
	this.targetUnits = [];
	this.SetupRangeQuery();
	this.SetupGaiaRangeQuery();
};

OutpostDetect.prototype.OnDiplomacyChanged = function(msg) //4
{
	if (!IsOwnedByPlayer(msg.player, this.entity))
		return;

	// Remove maybe now allied/neutral units.
	this.targetUnits = [];
	this.SetupRangeQuery();
	this.SetupGaiaRangeQuery();
};

OutpostDetect.prototype.OnDestroy = function() //5
{
	if (this.timer)
	{
		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(this.timer);
		this.timer = undefined;
	}

	// Clean up range queries.
	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (this.enemyUnitsQuery)
		cmpRangeManager.DestroyActiveQuery(this.enemyUnitsQuery);
	if (this.gaiaUnitsQuery)
		cmpRangeManager.DestroyActiveQuery(this.gaiaUnitsQuery);
};

/**
 * React on Attack value modifications, as it might influence the range.
 */
OutpostDetect.prototype.OnValueModification = function(msg) //6
{
	if (msg.component != "Attack")
		return;

	this.targetUnits = [];
	this.SetupRangeQuery();
	this.SetupGaiaRangeQuery();
};

/**
 * Setup the Range Query to detect units coming in & out of range.
 */
OutpostDetect.prototype.SetupRangeQuery = function() //7
{
	var cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if (!cmpAttack)
		return;

	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (this.enemyUnitsQuery)
	{
		cmpRangeManager.DestroyActiveQuery(this.enemyUnitsQuery);
		this.enemyUnitsQuery = undefined;
	}

	var cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
	{
		return;
	}	
	else
	{
		if (!this.timer) {
			//import { triggerFlareAction, target } from "./input.js"
			//triggerFlareAction(target);
			warn("Ennemies were detected nearby!");
			this.StartTimer();
		}
	}

	var enemies = cmpPlayer.GetEnemies();
	// Remove gaia.
	if (enemies.length && enemies[0] == 0)
		enemies.shift();

	if (!enemies.length)
		return;

	const range = cmpAttack.GetRange(attackType);
	const yOrigin = cmpAttack.GetAttackYOrigin(attackType);
	// This takes entity sizes into accounts, so no need to compensate for structure size.
	this.enemyUnitsQuery = cmpRangeManager.CreateActiveParabolicQuery(
		this.entity, range.min, range.max, yOrigin,
		enemies, IID_Resistance, cmpRangeManager.GetEntityFlagMask("normal"));

	cmpRangeManager.EnableActiveQuery(this.enemyUnitsQuery);
};

// Set up a range query for Gaia units within LOS range which can be attacked.
// This should be called whenever our ownership changes.
OutpostDetect.prototype.SetupGaiaRangeQuery = function () //8
{
	var cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if (!cmpAttack)
		return;

	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (this.gaiaUnitsQuery)
	{
		cmpRangeManager.DestroyActiveQuery(this.gaiaUnitsQuery);
		this.gaiaUnitsQuery = undefined;
	}

	var cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer || !cmpPlayer.IsEnemy(0))
		return;

	const range = cmpAttack.GetRange(attackType);
	const yOrigin = cmpAttack.GetAttackYOrigin(attackType);

	// This query is only interested in Gaia entities that can attack.
	// This takes entity sizes into accounts, so no need to compensate for structure size.
	this.gaiaUnitsQuery = cmpRangeManager.CreateActiveParabolicQuery(
		this.entity, range.min, range.max, yOrigin,
		[0], IID_Attack, cmpRangeManager.GetEntityFlagMask("normal"));

	cmpRangeManager.EnableActiveQuery(this.gaiaUnitsQuery);
};

/**
 * Called when units enter or leave range.
 */

OutpostDetect.prototype.OnRangeUpdate = function (msg) //9
{
	var cmpAttack = Engine.QueryInterface(this.entity, IID_Attack); //make it work without using Attack in xml
	if (!cmpAttack)
		return;
	else
	{
		if (!this.timer)
		{
			//import { triggerFlareAction, target } from "./input.js"
			//triggerFlareAction(target);
			warn("Ennemies were detected nearby!");
			this.StartTimer();
		}
	}
		
	// Target enemy units except non-dangerous animals.
	if (msg.tag == this.gaiaUnitsQuery)
	{
		msg.added = msg.added.filter(e => {
			let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
			return cmpUnitAI && (!cmpUnitAI.IsAnimal() || cmpUnitAI.IsDangerousAnimal());
		});
	}
	else if (msg.tag != this.enemyUnitsQuery)
		return;

	// Add new targets.
	for (let entity of msg.added)
		if (cmpAttack.CanAttack(entity))
			this.targetUnits.push(entity);

	// Remove targets outside of vision-range.
	for (let entity of msg.removed)
	{
		let index = this.targetUnits.indexOf(entity);
		if (index > -1)
			this.targetUnits.splice(index, 1);
	}

	if (this.targetUnits.length)
		this.StartTimer();
};

OutpostDetect.prototype.StartTimer = function () //10
{
	if (this.timer)
		return;

	var cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if (!cmpAttack)
		return;

	var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	var attackTimers = cmpAttack.GetTimers(attackType);

	this.timer = cmpTimer.SetInterval(this.entity, IID_OutpostDetect, "FireArrows",
		attackTimers.prepare, attackTimers.repeat / roundCount, null);
};

OutpostDetect.prototype.GetDefaultArrowCount = function () //11
{
	var arrowCount = +this.template.DefaultArrowCount;
	return Math.round(ApplyValueModificationsToEntity("OutpostDetect/DefaultArrowCount", arrowCount, this.entity));
};

OutpostDetect.prototype.GetMaxArrowCount = function() //12
{
	if (!this.template.MaxArrowCount)
		return Infinity;

	let maxArrowCount = +this.template.MaxArrowCount;
	return Math.round(ApplyValueModificationsToEntity("OutpostDetect/MaxArrowCount", maxArrowCount, this.entity));
};

OutpostDetect.prototype.GetGarrisonArrowMultiplier = function() //13
{
	var arrowMult = +this.template.GarrisonArrowMultiplier;
	return ApplyValueModificationsToEntity("OutpostDetect/GarrisonArrowMultiplier", arrowMult, this.entity);
};

OutpostDetect.prototype.GetGarrisonArrowClasses = function() //14
{
	var string = this.template.GarrisonArrowClasses;
	if (string)
		return string.split(/\s+/);
	return [];
};

/**
 * Returns the number of arrows which needs to be fired.
 * DefaultArrowCount + Garrisoned Archers (i.e., any unit capable
 * of shooting arrows from inside buildings).
 */
OutpostDetect.prototype.GetArrowCount = function() //15
{
	let count = this.GetDefaultArrowCount() +
		Math.round(this.archersGarrisoned * this.GetGarrisonArrowMultiplier());

	return Math.min(count, this.GetMaxArrowCount());
};

OutpostDetect.prototype.SetUnitAITarget = function(ent) //16
{
	this.unitAITarget = ent;
	if (ent)
		this.StartTimer();
};

/**
 * Fire arrows with random temporal distribution on prefered targets.
 * Called 'roundCount' times every 'RepeatTime' seconds when there are units in the range.
 */
OutpostDetect.prototype.FireArrows = function() //17
{
	if (!this.targetUnits.length && !this.unitAITarget)
	{
		if (!this.timer)
			return;

		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(this.timer);
		this.timer = undefined;
		return;
	}

	let cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if (!cmpAttack)
		return;

	if (this.currentRound > roundCount - 1)
		this.currentRound = 0;

	if (this.currentRound == 0)
		this.arrowsLeft = this.GetArrowCount();

	let arrowsToFire = 0;
	if (this.currentRound == roundCount - 1)
		arrowsToFire = this.arrowsLeft;
	else
		arrowsToFire = Math.min(
		    randIntInclusive(0, 2 * this.GetArrowCount() / roundCount),
		    this.arrowsLeft
		);

	if (arrowsToFire <= 0)
	{
		++this.currentRound;
		return;
	}

	// Add targets to a weighted list, to allow preferences.
	let targets = new WeightedList();
	let maxPreference = this.MAX_PREFERENCE_BONUS;
	let addTarget = function(target)
	{
		let preference = cmpAttack.GetPreference(target);
		let weight = 1;

		if (preference !== null && preference !== undefined)
			weight += maxPreference / (1 + preference);

		targets.push(target, weight);
	};

	// Add the UnitAI target separately, as the UnitMotion and RangeManager implementations differ.
	if (this.unitAITarget && this.targetUnits.indexOf(this.unitAITarget) == -1)
		addTarget(this.unitAITarget);
	for (let target of this.targetUnits)
		addTarget(target);

	// The obstruction manager performs approximate range checks.
	// so we need to verify them here.
	// TODO: perhaps an optional 'precise' mode to range queries would be more performant.
	const cmpObstructionManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_ObstructionManager);
	const range = cmpAttack.GetRange(attackType);
	const yOrigin = cmpAttack.GetAttackYOrigin(attackType);

	let firedArrows = 0;
	while (firedArrows < arrowsToFire && targets.length())
	{
		const selectedTarget = targets.randomItem();
		if (this.CheckTargetVisible(selectedTarget) && cmpObstructionManager.IsInTargetParabolicRange(
			this.entity,
			selectedTarget,
			range.min,
			range.max,
			yOrigin,
			false))
		{
			cmpAttack.PerformAttack(attackType, selectedTarget);
			PlaySound("attack_" + attackType.toLowerCase(), this.entity);
			++firedArrows;
			continue;
		}

		// Could not attack target, try a different target.
		targets.remove(selectedTarget);
	}

	this.arrowsLeft -= firedArrows;
	++this.currentRound;
};

/**
 * Returns true if the target entity is visible through the FoW/SoD.
 */
OutpostDetect.prototype.CheckTargetVisible = function(target) //18
{
	var cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	if (!cmpOwnership)
		return false;

	// Entities that are hidden and miraged are considered visible.
	var cmpFogging = Engine.QueryInterface(target, IID_Fogging);
	if (cmpFogging && cmpFogging.IsMiraged(cmpOwnership.GetOwner()))
		return true;

	// Either visible directly, or visible in fog.
	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	return cmpRangeManager.GetLosVisibility(target, cmpOwnership.GetOwner()) != "hidden";
};

Engine.RegisterComponentType(IID_OutpostDetect, "OutpostDetect", OutpostDetect);
