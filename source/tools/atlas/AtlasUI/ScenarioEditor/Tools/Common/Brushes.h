/* Copyright (C) 2015 Wildfire Games.
 * This file is part of 0 A.D.
 *
 * 0 A.D. is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * 0 A.D. is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with 0 A.D.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef INCLUDED_BRUSHES
#define INCLUDED_BRUSHES

class BrushShapeCtrl;
class BrushSizeCtrl;
class BrushStrengthCtrl;

#include <vector>

class BrushShape
{
public:
	BrushShape() : m_Strength(1.f) {}
	virtual ~BrushShape() {}

	virtual int GetDataWidth() const = 0;
	virtual int GetDataHeight() const = 0;
	virtual std::vector<float> GetData() const = 0;

	virtual float GetStrength() const { return this->m_Strength; }
	virtual void SetStrength(float strength) { this->m_Strength = strength; }

	virtual int GetSize() = 0;
	virtual void SetSize(int size) = 0;

	virtual int GetID() const = 0;

private:
	float m_Strength;
};

class BrushShapeCircle : public BrushShape
{
public:
	BrushShapeCircle() : m_Size(16) {}
	virtual ~BrushShapeCircle() {}

	virtual int GetDataWidth() const override { return m_Size; }
	virtual int GetDataHeight() const override { return m_Size; }
	virtual std::vector<float> GetData() const override;
	virtual int GetSize() override { return m_Size; }
	virtual void SetSize(int size) override { m_Size = size; }

	static const int id = 0;
	virtual int GetID() const override { return id; }
private:
	int m_Size;
};

class BrushShapeSquare : public BrushShape
{
public:
	BrushShapeSquare() : m_Size(16) {}
	virtual ~BrushShapeSquare() {}

	virtual int GetDataWidth() const override { return m_Size; }
	virtual int GetDataHeight() const override { return m_Size; }
	virtual std::vector<float> GetData() const override;
	virtual int GetSize() override { return m_Size; }
	virtual void SetSize(int size) override { m_Size = size; }

	static const int id = 1;
	virtual int GetID() const override { return id; }
private:
	int m_Size;
};

class BrushShapePyramid : public BrushShape
{
public:
	BrushShapePyramid() : m_Size(16) {}
	virtual ~BrushShapePyramid() {}

	virtual int GetDataWidth() const override { return m_Size; }
	virtual int GetDataHeight() const override { return m_Size; }
	virtual std::vector<float> GetData() const override;
	virtual int GetSize() override { return m_Size; }
	virtual void SetSize(int size) override { m_Size = size; }

	static const int id = 2;
	virtual int GetID() const override { return id; }
private:
	int m_Size;
};

class BrushShapeRidge : public BrushShape
{
public:
	BrushShapeRidge() : m_Size(16) {}
	virtual ~BrushShapeRidge() {}

	virtual int GetDataWidth() const override { return m_Size; }
	virtual int GetDataHeight() const override { return m_Size; }
	virtual std::vector<float> GetData() const override;
	virtual int GetSize() override { return m_Size; }
	virtual void SetSize(int size) override { m_Size = size; }
	static const int id = 3;
	virtual int GetID() const override { return id; }
private:
	int m_Size;
};

class BrushShapeX : public BrushShape
{
public:
	BrushShapeX() : m_Size(5) {}
	virtual ~BrushShapeX() {}

	virtual int GetDataWidth() const override { return m_Size; }
	virtual int GetDataHeight() const override { return m_Size; }
	virtual std::vector<float> GetData() const override;
	virtual int GetSize() override { return m_Size; }
	virtual void SetSize(int size) override { m_Size = size; }
	static const int id = 4;
	virtual int GetID() const override { return id; }
private:
	int m_Size;
};

class Brush
{
	friend class BrushShapeCtrl;
	friend class BrushSizeCtrl;
	friend class BrushStrengthCtrl;
public:
	Brush();
	~Brush();

	static const float STRENGTH_MULTIPLIER;

	/*int GetWidth() const;
	int GetHeight() const;
	std::vector<float> GetData() const;*/

	void SetCircle(int size);
	void SetSquare(int size);
	void SetPyramid(int size);
	void SetRidge(int size);
	void SetX(int size);
	/*void SetShape(int id, int size);*/
	float GetStrength() const { return m_Shape->GetStrength(); };
	/*void SetStrength(float strength); */

	void CreateUI(wxWindow* parent, wxSizer* sizer);

	// Set this brush to be active - sends SetBrush message now, and also
	// whenever the brush is altered (until a different one is activated).
	void MakeActive();

private:
	// If active, send SetBrush message to the game
	void Send();

	std::unique_ptr<BrushShape> m_Shape;
	/*int m_Size;*/
	/*float m_Strength;*/
	bool m_IsActive;
};

extern Brush g_Brush_Elevation;

#endif // INCLUDED_BRUSHES