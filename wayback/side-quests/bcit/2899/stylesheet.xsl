<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" omit-xml-declaration="yes" doctype-public="-//W3C//DTD XHTML 1.0 Transitional//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd" indent="yes"/>
<xsl:template match="/">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <title><xsl:value-of select="rss/channel/title" /></title>
  </head>
  <body>
    <h1>
      <a>
        <xsl:attribute name="href">
          <xsl:value-of select="rss/channel/link" />
        </xsl:attribute>
        <xsl:value-of select="rss/channel/title" />
      </a>
    </h1>
    <h2><xsl:value-of select="rss/channel/description" /></h2>
    <xsl:for-each select="rss/channel/item">
    <h3><xsl:value-of select="title" /></h3>
    <p><xsl:value-of select="description" /><br /><i>Published <xsl:value-of select="pubDate" /></i></p>
    </xsl:for-each>
    <p>Last Updated: <i><xsl:value-of select="rss/channel/lastBuildDate" /></i></p>
  </body>
</html>
</xsl:template>
</xsl:stylesheet> 
